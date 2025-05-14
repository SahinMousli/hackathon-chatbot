terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}



variable "name" {
  description = "The name of the VPC"
  type        = string
  default     = ""
}

variable "cidr" {
  description = "The IPv4 CIDR block for the VPC."
  type        = string
  default     = "172.16.0.0/16"
}

variable "azs" {
  description = "A list of availability zones names or ids in the region"
  type        = list(string)
}

variable "public_subnets" {
  description = "A list of public subnets inside the VPC"
  type        = list(string)
  default     = []
}

variable "private_subnets" {
  description = "A list of private subnets inside the VPC"
  type        = list(string)
  default     = []
}

variable "single_nat_gateway" {
  description = "Should be true if you want to provision a single shared NAT Gateway across all of your private networks"
  type        = bool
  default     = true
}

variable "one_nat_gateway_per_az" {
  description = "Should be true if you want only one NAT Gateway per availability zone. Requires `var.azs` to be set, and the number of `public_subnets` created to be greater than or equal to the number of availability zones specified in `var.azs`"
  type        = bool
  default     = false
}

variable "private_subnet_peering" {
  description = "The route to the VPC peering resource for the private subnets"
  type        = object({
    connection_id    = string
    destination_cidr = string
  })
  default = null
}

variable "peer_destination_cidr" {
  description = "The destination IPv4 CIDR block for the VPC Peering connection"
  type = string
  default = ""
}

variable "peer_connection_id" {
  description = "The VPC Peering Connection ID"
  type = string
  default = ""
}

variable "environment" {
  type = string
}




output "vpc_id" {
  description = "The ID of the VPC"
  value = aws_vpc.this.id
}

output "vpc_arn" {
  description = "The ARN of the VPC"
  value = aws_vpc.this.arn
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}



resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_hostnames = true

  tags = {
    Name = var.name
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count                 = length(var.public_subnets)
  vpc_id                = aws_vpc.this.id
  cidr_block            = element(var.public_subnets, count.index)
  availability_zone     = element(var.azs, count.index)

  tags = {
    Name = "${var.name}-public-subnet-${count.index}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count                 = length(var.private_subnets)
  vpc_id                = aws_vpc.this.id
  cidr_block            = element(var.private_subnets, count.index)
  availability_zone     = element(var.azs, count.index)

  tags = {
    Name = "${var.name}-private-subnet-${count.index}"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.name}-igw"
    Environment = var.environment
  }
}

################################################################################
# Public Route Table
################################################################################

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = element(aws_subnet.public[*].id, count.index)
  route_table_id = aws_route_table.public.id
}

################################################################################
# NAT Gateway
################################################################################

locals {
  nat_gateway_count = var.single_nat_gateway ? 1 : length(var.azs)
}

resource "aws_eip" "nat" {
  count  = local.nat_gateway_count
  domain = "vpc"

  tags = {
    Name = "${var.name}-nat-${count.index}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count = local.nat_gateway_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = element(
    aws_subnet.public[*].id,
    var.single_nat_gateway ? 0 : count.index,
  )

  tags = {
    Name = "${var.name}-nat-gateway-${count.index}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.this]
}

################################################################################
# Private Route Table
################################################################################

resource "aws_route_table" "private" {
  count  = length(var.private_subnets)
  vpc_id = aws_vpc.this.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnets)
  subnet_id      = element(aws_subnet.private[*].id, count.index)
  route_table_id = element(
    aws_route_table.private[*].id,
    var.single_nat_gateway ? 0 : count.index,
  )
}

resource "aws_route" "private_nat_gateway" {
  count = local.nat_gateway_count

  route_table_id         = element(aws_route_table.private[*].id, count.index)
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = element(aws_nat_gateway.this[*].id, count.index)

  timeouts {
    create = "5m"
  }
}

resource "aws_route" "private_peering_route" {
  count                     = var.private_subnet_peering != null ? length(var.private_subnets) : 0
  route_table_id            = element(aws_route_table.private[*].id, count.index)
  destination_cidr_block    = var.private_subnet_peering.destination_cidr
  vpc_peering_connection_id = var.private_subnet_peering.connection_id
}

################################################################################
# Associate Cavalier Subnet to Public RTB
################################################################################

resource "aws_route" "peer_route" {
  count = (var.peer_destination_cidr != "" && var.peer_connection_id != "") ? 1 : 0

  route_table_id = element(aws_route_table.public[*].id, count.index)
  destination_cidr_block = var.peer_destination_cidr
  vpc_peering_connection_id = var.peer_connection_id
}
