variable "app_name"   { type = string }
variable "env"        { type = string }
variable "api_domain" {
  description = "BE API domain (used in CORS allowed_origins)"
  type        = string
}

# ── S3 bucket for BE image storage ────────────────────────────────────────────

resource "aws_s3_bucket" "images" {
  bucket = "${var.app_name}-images-${var.env}"

  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

# Block all public access — images served via signed URLs or direct BE proxy
resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning — protect against accidental overwrites
resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id
  versioning_configuration {
    status = "Enabled"
  }
}

# CORS — allow BE (EC2) to PUT/GET objects directly
resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [var.api_domain]
    max_age_seconds = 3600
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "bucket_id"  { value = aws_s3_bucket.images.id }
output "bucket_arn" { value = aws_s3_bucket.images.arn }
