terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  # Separate state bucket for the full monorepo stack.
  # Bootstrap: create this bucket manually once before first `terraform init`.
  #   aws s3api create-bucket --bucket o-daria-tfstate --region us-east-1
  #   aws s3api put-bucket-versioning --bucket o-daria-tfstate \
  #     --versioning-configuration Status=Enabled
  backend "s3" {
    bucket  = "o-daria-tfstate"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Frontend: S3 + CloudFront ─────────────────────────────────────────────────

module "s3_hosting" {
  source                      = "./modules/s3-hosting"
  app_name                    = var.app_name
  env                         = var.environment
  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

module "cloudfront" {
  source           = "./modules/cloudfront"
  app_name         = var.app_name
  env              = var.environment
  s3_bucket_id     = module.s3_hosting.bucket_id
  s3_bucket_domain = module.s3_hosting.bucket_regional_domain
  oac_id           = module.s3_hosting.oac_id
  ec2_api_ip       = module.ec2_be.public_dns
}

module "iam_deploy" {
  source           = "./modules/iam-deploy"
  app_name         = var.app_name
  env              = var.environment
  bucket_arn       = module.s3_hosting.bucket_arn
  cf_dist_arn      = module.cloudfront.distribution_arn
  ec2_instance_arn = module.ec2_be.instance_arn
}

# ── Backend: EC2 + S3 images ──────────────────────────────────────────────────

module "s3_images" {
  source     = "./modules/s3-images"
  app_name   = var.app_name
  env        = var.environment
  # api_domain for CORS — same cycle-breaking approach as frontend_url.
  # Empty string on first apply; tighten after EC2 public DNS is known.
  api_domain = var.frontend_url != "" ? "https://${split("//", var.frontend_url)[1]}" : "*"
}

module "ec2_be" {
  source               = "./modules/ec2-be"
  app_name             = var.app_name
  env                  = var.environment
  aws_region           = var.aws_region
  s3_images_bucket     = module.s3_images.bucket_id
  s3_images_bucket_arn = module.s3_images.bucket_arn
  anthropic_api_key    = var.anthropic_api_key
  google_client_id     = var.google_client_id
  api_key              = var.api_key
  # frontend_url breaks the CloudFront ↔ EC2 cycle if set to module output.
  # Pass it as a root variable (default ""). After first apply, set
  # TF_VAR_frontend_url="https://<cf-domain>" and re-apply to enable strict CORS.
  frontend_url         = var.frontend_url
  user_data_tpl_path   = "${path.module}/user_data.sh.tpl"
}
