variable "app_name" { type = string }
variable "env" { type = string }
variable "bucket_arn" { type = string }
variable "cf_dist_arn" { type = string }

data "aws_caller_identity" "current" {}

# Least-privilege deploy policy — SECURITY-06
data "aws_iam_policy_document" "deploy" {
  statement {
    sid    = "S3SyncAccess"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      var.bucket_arn,
      "${var.bucket_arn}/*",
    ]
  }

  statement {
    sid    = "CloudFrontInvalidation"
    effect = "Allow"
    actions = ["cloudfront:CreateInvalidation"]
    resources = [var.cf_dist_arn]
  }
}

resource "aws_iam_policy" "deploy" {
  name        = "${var.app_name}-${var.env}-deploy-policy"
  description = "Least-privilege policy for GitHub Actions CI/CD deployment"
  policy      = data.aws_iam_policy_document.deploy.json
}

resource "aws_iam_user" "deploy" {
  name = "${var.app_name}-${var.env}-deploy"
  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_user_policy_attachment" "deploy" {
  user       = aws_iam_user.deploy.name
  policy_arn = aws_iam_policy.deploy.arn
}

output "deploy_user_name" { value = aws_iam_user.deploy.name }
