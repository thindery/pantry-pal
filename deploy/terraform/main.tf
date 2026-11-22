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

# Resend (dedicated mypantryhub.com account) + DMARC.
# Live apex SPF is Cloudflare Email Routing only — do not add amazonses.com
# at the apex (sending uses the send/rsend Forge CNAMEs, not apex SPF).
# Apex MX stays Cloudflare Email Routing; do not add a Resend receiving MX.
resource "cloudflare_record" "spf" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "@"
  content = "v=spf1 include:_spf.mx.cloudflare.net ~all"
  type    = "TXT"
}

resource "cloudflare_record" "dmarc" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "_dmarc"
  content = "v=DMARC1; p=none; pct=100; rua=mailto:dmarc-reports@${var.domain_name}"
  type    = "TXT"
}

resource "cloudflare_record" "resend_dkim" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "resend._domainkey"
  content = "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDNns3JEtiWRZSDyr2W3WAvGatJFJbJxwCRoskN5yX8khOQqfOt8SLFWPPSJkn4FlLm0ENS5uhKqSzVHnGWFuZ9NA9aYtJNhj3BjCo7o6Vl52X5gAb2OZNjQYgk+BV6b15x+pWjrAYdg0EQWzH9+3EmiH+4XTGCWICT6VSdsckQJQIDAQAB"
  type    = "TXT"
}

resource "cloudflare_record" "resend_send" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "send"
  content = "send.forge.rmta.net"
  type    = "CNAME"
  proxied = false
}

resource "cloudflare_record" "resend_rsend" {
  zone_id = data.cloudflare_zone.zone.id
  name    = "rsend"
  content = "rsend.forge.rmta.net"
  type    = "CNAME"
  proxied = false
}
