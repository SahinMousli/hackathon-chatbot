db_password      = "changeme123"
oauth_token      = "YOUR_GITHUB_TOKEN"


name                = "hackathon-chatbot"
environment         = "main"
aws-region          = "us-west-2"
availability_zones  = ["us-west-2a", "us-west-2b"]
private_subnets     = ["10.6.11.0/25", "10.6.11.128/25"]
public_subnets      = ["10.6.12.0/25", "10.6.12.128/25"]
cidr                = "10.6.0.0/20"
database_name       = "hackathon-chatbot"
database_username   = "baseuser"
