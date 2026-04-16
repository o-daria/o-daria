# ── Frontend outputs ──────────────────────────────────────────────────────────

output "cloudfront_domain_name" {
  description = "CloudFront domain — use as VITE_MFE_*_URL base in deploy.yml"
  value       = module.cloudfront.distribution_domain
}

output "s3_fe_bucket_name" {
  description = "FE S3 bucket name for CI/CD sync"
  value       = module.s3_hosting.bucket_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.cloudfront.distribution_id
}

output "deploy_user_name" {
  description = "IAM deploy user name (create access keys manually for CI secrets)"
  value       = module.iam_deploy.deploy_user_name
}

# ── Backend outputs ───────────────────────────────────────────────────────────

output "ec2_public_ip" {
  description = "Elastic IP of the BE EC2 instance — point your domain here"
  value       = module.ec2_be.public_ip
}

output "ec2_public_dns" {
  description = "EC2 public DNS — used as API domain until custom domain is set"
  value       = module.ec2_be.public_dns
}

output "s3_images_bucket_name" {
  description = "S3 images bucket name — set S3_IMAGES_BUCKET in BE env"
  value       = module.s3_images.bucket_id
}
