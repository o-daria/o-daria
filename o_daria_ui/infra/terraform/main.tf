terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  backend "s3" {
    bucket         = "o-daria-ui-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "o-daria-ui-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

module "s3_hosting" {
  source   = "./modules/s3-hosting"
  app_name = var.app_name
  env      = var.environment
}

module "cloudfront" {
  source              = "./modules/cloudfront"
  app_name            = var.app_name
  env                 = var.environment
  s3_bucket_id        = module.s3_hosting.bucket_id
  s3_bucket_domain    = module.s3_hosting.bucket_regional_domain
  external_api_domain = var.external_api_domain
}

module "iam_deploy" {
  source      = "./modules/iam-deploy"
  app_name    = var.app_name
  env         = var.environment
  bucket_arn  = module.s3_hosting.bucket_arn
  cf_dist_arn = module.cloudfront.distribution_arn
}
