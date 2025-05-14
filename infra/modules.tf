terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"
}


provider "aws" {
  region = "us-east-1"
}


locals {
  database = tomap({
    dbname       = var.database_name
    username     = lookup(module.secretsmanager.data, "username", var.database_username)
    password     = lookup(module.secretsmanager.data, "password", random_password.rds_password.result)
    min_capacity = 0.5
    max_capacity = 1
  })

  environment_vars = {
    "secret_name"       = "${var.environment}/${var.name}/secrets",
    "database_host"     = module.rds.rds_hostname,
    "database_dbname"   = local.database.dbname,
    "database_username" = local.database.username,
    "database_password" = local.database.password
  }
}

# Zero-hour password generation
resource "random_password" "rds_password" {
  length           = 16
  special          = true
  override_special = "!#$&*()-_=+[]{}:?"
}

module "secretsmanager" {
  source = "./secretsmanager"
  name   = "${var.environment}/${var.name}/secrets2"
  data =
}

resource "aws_secretsmanager_secret" "secret" {
  name                    = 'hackathon-chatbot-secrets'
  recovery_window_in_days = 0 // Overriding the default recovery window of 30 days
}

resource "aws_secretsmanager_secret_version" "secret" {
  secret_id     = aws_secretsmanager_secret.secret.id
  secret_string = jsonencode({
    "username" : var.database_username,
    "password" : random_password.rds_password.result
  })
}

module "vpc" {
  source             = "./vpc"
  name               = var.name
  cidr               = var.cidr
  private_subnets    = var.private_subnets
  public_subnets     = var.public_subnets
  azs                = var.availability_zones
  environment        = var.environment
  single_nat_gateway = true
}


#DB


resource "aws_security_group" "database" {
  name        = "database"
  description = "Allow inbound traffic"
  vpc_id      = var.vpc_id

  # Allow internal TCP
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.ingress_cidr_block]
  }

  # Block external access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    "Name" = "${var.environment}-${var.app_name}-aws_security_group"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-${var.app_name}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    "Name" = "${var.environment}-${var.app_name}-db-subnet-group"
  }
}

resource "aws_rds_cluster_parameter_group" "main" {
  name        = "${var.environment}-${var.app_name}-db-param-group"
  family      = "aurora-postgresql15"
  description = "Database parameter group"
}

resource "aws_rds_cluster" "main" {
  cluster_identifier                  = "${var.environment}-${var.app_name}-rds-cluster"
  master_username                     = var.database.username
  master_password                     = var.database.password
  db_cluster_parameter_group_name     = aws_rds_cluster_parameter_group.main.name
  db_subnet_group_name                = aws_db_subnet_group.main.name
  backtrack_window                    = 0
  backup_retention_period             = 30
  copy_tags_to_snapshot               = false
  database_name                       = var.database.dbname
  deletion_protection                 = true
  enable_http_endpoint                = true
  engine                              = "aurora-postgresql"
  engine_mode                         = "provisioned"
  engine_version                      = "15.4"
  iam_database_authentication_enabled = false
  network_type                        = "IPV4"
  port                                = local.port
  preferred_backup_window             = "22:20-22:50"
  preferred_maintenance_window        = "tue:03:56-tue:04:26"
  skip_final_snapshot                 = true
  storage_encrypted                   = true
  enabled_cloudwatch_logs_exports     = []
  iam_roles                           = []
  availability_zones                  = var.availability_zones
  vpc_security_group_ids              = [aws_security_group.database.id]

  serverlessv2_scaling_configuration {
    max_capacity = var.database.max_capacity
    min_capacity = var.database.min_capacity
  }

  lifecycle {
    ignore_changes = [availability_zones]
  }

  tags = {
    "Name" = "${var.environment}-${var.app_name}-rds-cluster"
  }
}

resource "aws_rds_cluster_instance" "main" {

  identifier                 = "${var.environment}-${var.app_name}-cluster-instance"
  cluster_identifier         = aws_rds_cluster.main.cluster_identifier
  db_subnet_group_name       = aws_db_subnet_group.main.name
  auto_minor_version_upgrade = false
  # availability_zone                     = var.availability_zones[0]
  # ca_cert_identifier                    = "rds-ca-rsa2048-g1"
  copy_tags_to_snapshot = false
  engine                = "aurora-postgresql"
  engine_version        = "15.4"
  instance_class        = "db.serverless"
  # Tmonitoring_interval                   = 60
  # monitoring_role_arn                   = aws_iam_role.rds_enhanced_monitoring.arn
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  promotion_tier                        = 1
  publicly_accessible                   = false

  tags = {
    "Name" = "${var.environment}-${var.app_name}"
  }
}

## END OF DB

resource "aws_db_subnet_group" "default" {
  name       = "main"
  subnet_ids = ["subnet-xxxxxxxx", "subnet-yyyyyyyy"] # Replace with your subnet IDs
}

resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.micro"
  name                 = "mydb"
  username             = "postgres"
  password = var.db_password
  db_subnet_group_name = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.postgres_sg.id]
  skip_final_snapshot  = true
  publicly_accessible  = false
}


resource "aws_amplify_app" "my_app" {
  name                = "hackathon-chatbot"
  repository          = "https://github.com/G0ldsam/hackathon-chatbot" # Replace with your repo
  oauth_token         = var.oauth_token     # Store securely, e.g., use terraform variables

  environment_variables = {
    ENV = "main"
  }
}



resource "aws_security_group" "postgres_sg" {
  name        = "postgres-sg"
  description = "Allow PostgreSQL inbound traffic"
  vpc_id      = "vpc-xxxxxxxx"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Restrict as needed
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
