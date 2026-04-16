variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "o-daria"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

# ── Secrets (set via TF_VAR_* env vars in CI or terraform.tfvars.prod) ────────

variable "anthropic_api_key" {
  description = "Anthropic API key — injected into EC2 via user_data"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID — injected into EC2 env + used in CSP"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "Bearer API key for dev/service-to-service access"
  type        = string
  sensitive   = true
}
