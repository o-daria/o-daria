variable "app_name"             { type = string }
variable "env"                  { type = string }
variable "aws_region"           { type = string }
variable "s3_images_bucket"     { type = string }
variable "s3_images_bucket_arn" { type = string }
variable "anthropic_api_key" {
  type      = string
  sensitive = true
}
variable "google_client_id" {
  type      = string
  sensitive = true
}
variable "api_key" {
  type      = string
  sensitive = true
}
variable "frontend_url"         { type = string }
variable "user_data_tpl_path"   { type = string }

# ── Latest Amazon Linux 2023 ARM64 AMI ────────────────────────────────────────

data "aws_ami" "al2023_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Security group — BE API port only, no SSH ──────────────────────────────────

resource "aws_security_group" "be" {
  name        = "${var.app_name}-${var.env}-be-sg"
  description = "BE API - inbound 3300 only, all outbound"

  ingress {
    description = "BE API"
    from_port   = 3300
    to_port     = 3300
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

# ── IAM instance profile — S3 images access ───────────────────────────────────

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "be" {
  name               = "${var.app_name}-${var.env}-be-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json

  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

data "aws_iam_policy_document" "s3_images" {
  statement {
    sid    = "S3ImagesAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      var.s3_images_bucket_arn,
      "${var.s3_images_bucket_arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "s3_images" {
  name   = "s3-images-access"
  role   = aws_iam_role.be.id
  policy = data.aws_iam_policy_document.s3_images.json
}

resource "aws_iam_instance_profile" "be" {
  name = "${var.app_name}-${var.env}-be-profile"
  role = aws_iam_role.be.name
}

# ── EC2 instance — t3.micro (x86_64, free tier eligible) ─────────────────────

resource "aws_instance" "be" {
  ami                    = data.aws_ami.al2023_arm.id
  instance_type          = "t3.micro"
  iam_instance_profile   = aws_iam_instance_profile.be.name
  vpc_security_group_ids = [aws_security_group.be.id]

  # 30 GB gp3 root volume (docker images + pg_data volume)
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  user_data = templatefile(var.user_data_tpl_path, {
    anthropic_api_key = var.anthropic_api_key
    google_client_id  = var.google_client_id
    api_key           = var.api_key
    frontend_url      = var.frontend_url
    s3_images_bucket  = var.s3_images_bucket
    aws_region        = var.aws_region
    app_name          = var.app_name
  })

  tags = {
    Name        = "${var.app_name}-${var.env}-be"
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }

  lifecycle {
    # Prevent accidental instance replacement when user_data changes (secrets rotation).
    # To apply user_data changes: taint the instance and re-apply.
    ignore_changes = [user_data]
  }
}

# ── Elastic IP — stable public address ────────────────────────────────────────

resource "aws_eip" "be" {
  instance = aws_instance.be.id
  domain   = "vpc"

  tags = {
    Application = var.app_name
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "public_ip"  { value = aws_eip.be.public_ip }
output "public_dns" { value = aws_eip.be.public_dns }
output "instance_id" { value = aws_instance.be.id }
