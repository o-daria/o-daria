variable "app_name"            { type = string }
variable "env"                 { type = string }
variable "s3_bucket_id"        { type = string }
variable "s3_bucket_domain"    { type = string }
variable "oac_id"              { type = string }
variable "external_api_domain" {
  type    = string
  default = "*"
  description = "API domain for CSP connect-src. Defaults to wildcard; tighten after EC2 is provisioned."
}

variable "ec2_api_ip" {
  type        = string
  description = "Public DNS hostname of the EC2 BE instance. Used as CloudFront origin for /api/* path."
}

variable "ec2_api_port" {
  type        = number
  default     = 3300
  description = "Port the API listens on."
}

# ── Security headers policy ───────────────────────────────────────────────────

resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${var.app_name}-${var.env}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    content_security_policy {
      # connect-src includes accounts.google.com for Google Sign-In token exchange
      content_security_policy = "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${var.external_api_domain} https://accounts.google.com; img-src 'self' data: https://lh3.googleusercontent.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
      override                = true
    }
  }
}

# ── Origin request policy: forward Authorization + all query strings/cookies ──

# ── CloudFront Function: strip /api prefix before forwarding to EC2 ──────────

resource "aws_cloudfront_function" "strip_api_prefix" {
  name    = "${var.app_name}-${var.env}-strip-api-prefix"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOF
    async function handler(event) {
      var request = event.request;
      request.uri = request.uri.replace(/^\/api/, '') || '/';
      return request;
    }
  EOF
}

# ── CloudFront distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "${var.app_name}-${var.env}"

  origin {
    domain_name              = var.s3_bucket_domain
    origin_id                = "s3-${var.s3_bucket_id}"
    origin_access_control_id = var.oac_id
  }

  origin {
    domain_name = var.ec2_api_ip
    origin_id   = "ec2-api"
    custom_origin_config {
      http_port              = var.ec2_api_port
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # SPA fallback — shell handles all client-side routing
  custom_error_response {
    error_code            = 403
    response_page_path    = "/index.html"
    response_code         = 200
  }
  custom_error_response {
    error_code            = 404
    response_page_path    = "/index.html"
    response_code         = 200
  }

  # Default: cache static assets aggressively
  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-${var.s3_bucket_id}"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    compress                   = true
  }

  # /api/* — proxy to EC2, no caching, strip /api prefix via CloudFront Function
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "ec2-api"
    viewer_protocol_policy   = "redirect-to-https"
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3" # AllViewer
    compress                 = false

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.strip_api_prefix.arn
    }
  }

  # remoteEntry.js — no cache (Module Federation entry points must always be fresh)
  ordered_cache_behavior {
    path_pattern               = "*/remoteEntry.js"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-${var.s3_bucket_id}"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    cache_policy_id            = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    compress                   = true
  }

  # index.html — no cache (SPA entry point must always be fresh)
  ordered_cache_behavior {
    path_pattern               = "*/index.html"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "s3-${var.s3_bucket_id}"
    viewer_protocol_policy     = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    cache_policy_id            = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    compress                   = true
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "distribution_id"     { value = aws_cloudfront_distribution.app.id }
output "distribution_arn"    { value = aws_cloudfront_distribution.app.arn }
output "distribution_domain" { value = aws_cloudfront_distribution.app.domain_name }
