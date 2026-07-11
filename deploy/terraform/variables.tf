variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone.DNS edit permissions"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Primary domain"
  type        = string
  default     = "mypantryhub.com"
}

variable "server_ip" {
  description = "OVH server IP"
  type        = string
  default     = "15.204.254.25"
}