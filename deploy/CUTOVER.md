# Production cutover — mypantryhub.com

**Tickets:** PP-033 (DNS) → PP-034 (OVH deploy) → PP-035 (Railway teardown)

## PP-033 — DNS & config (repo)

- [x] Domain: **mypantryhub.com** (purchased)
- [x] Zone in Cloudflare (active)
- [x] Terraform: `deploy/terraform/`
- [x] Nginx template: `deploy/nginx/pantry-pal.conf`
- [x] Prod env template: `.env.prod.example`
- [x] `terraform apply` in `deploy/terraform/` (A @, CNAME www, wildcard *) — applied 2026-07-11
- [ ] Cloudflare SSL mode: **Full**
- [ ] Clerk production: add `https://www.mypantryhub.com`, `https://mypantryhub.com` to allowed origins; webhook URL `https://www.mypantryhub.com/api/webhooks/clerk`
- [ ] Stripe production: webhook `https://www.mypantryhub.com/api/webhooks/stripe`
- [ ] Resend (if used): verify `mypantryhub.com`, add DKIM in dashboard

## PP-034 — OVH

```bash
# 1. On OVH: clone repo, copy .env.prod.example → .env.prod, fill secrets
ssh ovh
sudo mkdir -p /opt/pantry-pal && sudo chown $USER /opt/pantry-pal
# git clone … /opt/pantry-pal

# 2. Install nginx vhost
sudo cp /opt/pantry-pal/deploy/nginx/pantry-pal.conf /etc/nginx/conf.d/pantry-pal.conf
sudo nginx -t && sudo systemctl reload nginx

# 3. Deploy from laptop
./deploy/deploy-docker.sh main
```

## Smoke (production)

```bash
curl -sf https://www.mypantryhub.com/health
curl -sf https://www.mypantryhub.com/build-id.txt
# Sign in via Clerk, create item, check Stripe checkout redirect
```

## Clerk custom domain (optional later)

If using `clerk.mypantryhub.com`, add **DNS-only** CNAME per `project-director/playbooks/cloudflare_dns.md` (grey cloud, not proxied).