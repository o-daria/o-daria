variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "o-daria-ui"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "external_api_domain" {
  description = "External backend API domain (used in CSP connect-src)"
  type        = string
}
