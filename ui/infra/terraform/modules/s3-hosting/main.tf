resource "aws_s3_bucket" "app" {
  bucket = "${var.app_name}-${var.env}"

  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

# Block all public access — SECURITY-07
resource "aws_s3_bucket_public_access_block" "app" {
  bucket                  = aws_s3_bucket.app.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption at rest — SECURITY-01
resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "app" {
  name                              = "${var.app_name}-${var.env}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Bucket policy — allow only CloudFront OAC — SECURITY-06
data "aws_iam_policy_document" "s3_cloudfront" {
  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.app.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "app" {
  bucket = aws_s3_bucket.app.id
  policy = data.aws_iam_policy_document.s3_cloudfront.json
  # Note: cloudfront_distribution_arn is passed after cloudfront module runs
  # In practice, use depends_on or a two-pass apply for the circular dependency
}

variable "app_name" { type = string }
variable "env" { type = string }
variable "cloudfront_distribution_arn" {
  type    = string
  default = "*"  # Initial placeholder — update after first apply
}

output "bucket_id" { value = aws_s3_bucket.app.id }
output "bucket_arn" { value = aws_s3_bucket.app.arn }
output "bucket_regional_domain" { value = aws_s3_bucket.app.bucket_regional_domain_name }
output "oac_id" { value = aws_cloudfront_origin_access_control.app.id }
