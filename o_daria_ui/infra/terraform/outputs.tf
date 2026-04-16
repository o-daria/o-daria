output "cloudfront_domain_name" {
  description = "CloudFront distribution domain — set VITE_MFE_*_URL to https://<this>/<mfe-path>/remoteEntry.js"
  value       = module.cloudfront.distribution_domain
}

output "s3_bucket_name" {
  description = "S3 bucket name for CI/CD sync"
  value       = module.s3_hosting.bucket_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.cloudfront.distribution_id
}
