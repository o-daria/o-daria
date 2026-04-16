variable "app_name"    { type = string }
variable "env"         { type = string }
variable "bucket_arn"  { type = string }
variable "cf_dist_arn" { type = string }

data "aws_caller_identity" "current" {}

# ── Least-privilege deploy policy ─────────────────────────────────────────────

variable "ec2_instance_arn" {
  description = "ARN of the BE EC2 instance (for SSM SendCommand permission)"
  type        = string
}

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
    sid       = "CloudFrontInvalidation"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [var.cf_dist_arn]
  }

  statement {
    sid    = "SSMDeployBE"
    effect = "Allow"
    actions = [
      "ssm:SendCommand",
      "ssm:GetCommandInvocation",
    ]
    resources = [
      var.ec2_instance_arn,
      "arn:aws:ssm:*::document/AWS-RunShellScript",
    ]
  }

  statement {
    sid       = "EC2DescribeForSSM"
    effect    = "Allow"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "deploy" {
  name        = "${var.app_name}-${var.env}-fe-deploy-policy"
  description = "Least-privilege policy for GitHub Actions FE deployment (S3 sync + CF invalidation)"
  policy      = data.aws_iam_policy_document.deploy.json
}

# ── IAM user for GitHub Actions (access keys created manually post-apply) ─────
# Note: prefer GitHub OIDC if you migrate to a multi-repo setup.

resource "aws_iam_user" "deploy" {
  name = "${var.app_name}-${var.env}-fe-deploy"
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

# ── Outputs ───────────────────────────────────────────────────────────────────

output "deploy_user_name" { value = aws_iam_user.deploy.name }
