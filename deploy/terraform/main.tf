terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "cloudflare_zone" "zone" {
  name = var.domain_name
}

resource "cloudflare_record" "root_a" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "@"
  content = var.server_ip
  type    = "A"
  proxied = true
}

resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "www"
  content = var.domain_name
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "wildcard" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "*"
  content = var.server_ip
  type    = "A"
  proxied = true
}

# Resend / DMARC (DKIM via Resend dashboard after domain verify)
resource "cloudflare_record" "spf" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "@"
  content = "v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all"
  type    = "TXT"
}

resource "cloudflare_record" "dmarc" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "_dmarc"
  content = "v=DMARC1; p=none; pct=100; rua=mailto:dmarc-reports@${var.domain_name}"
  type    = "TXT"
}

resource "cloudflare_record" "resend_send_spf" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "send"
  content = "v=spf1 include:amazonses.com ~all"
  type    = "TXT"
}

resource "cloudflare_record" "resend_send_mx" {
  zone_id  = data.cloudflare_zone.zone.id
  name     = "send"
  content  = "feedback-smtp.us-east-1.amazonses.com"
  type     = "MX"
  priority = 10
}