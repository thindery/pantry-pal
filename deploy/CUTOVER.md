# Production cutover — mypantryhub.com

**Tickets:** PP-033 (DNS) → PP-034 (OVH deploy) → PP-035 (Railway teardown)

OVH follows the same pattern as **agent-paige** and **userkudos**: app containers on shared `app-network`, central Docker nginx at `/opt/nginx/`.

## Architecture (OVH)

```
Cloudflare (proxied, SSL Full) → OVH :443
  → nginx container (/opt/nginx) — conf.d/*.conf
    → pantry-pal-frontend:3000  (Next.js)
    → pantry-pal-backend:8000   (/api/, /health)
    → pantry-pal-db             (Postgres, internal)
```

| Path on server | Purpose |
|----------------|---------|
| `/opt/pantry-pal` | Git clone + `docker compose` |
| `/opt/nginx/conf.d/pantry-pal.conf` | Vhost (copied on each deploy) |
| `/opt/nginx/ssl/cert.pem` | Shared origin cert (Cloudflare Full) |
| `app-network` | Shared Docker bridge (external) |

**Do not** use host `/etc/nginx` or `127.0.0.1` upstreams — the nginx container cannot reach host ports that way.

## PP-033 — DNS & config

- [x] Domain: **mypantryhub.com**
- [x] Terraform applied (`deploy/terraform/`)
- [x] Nginx template uses container names + `resolver 127.0.0.11`
- [x] `.env.prod.example`
- [ ] Cloudflare SSL mode: **Full**
- [ ] Clerk: origins `https://www.mypantryhub.com`, `https://mypantryhub.com`; webhook `https://www.mypantryhub.com/api/webhooks/clerk`
- [ ] Stripe webhook: `https://www.mypantryhub.com/api/webhooks/stripe`

## PP-034 — First deploy

```bash
# 1. On laptop: ensure .env.prod exists on server (one-time)
ssh ovh
cp /opt/pantry-pal/.env.prod.example /opt/pantry-pal/.env.prod   # after clone
# Fill Clerk/Stripe/Postgres secrets

# 2. Deploy (clones repo on first run, installs nginx vhost)
./deploy/deploy-docker.sh main
```

The deploy script will:
- Clone to `/opt/pantry-pal` if missing
- `docker compose up -d --build` on `app-network`
- Run migrations
- Copy `deploy/nginx/pantry-pal.conf` → `/opt/nginx/conf.d/`
- Reload central nginx: `docker compose exec -T nginx nginx -s reload`

## Smoke

```bash
curl -sf https://www.mypantryhub.com/health
curl -sf https://www.mypantryhub.com/build-id.txt
```

## Compare with agent-paige

| Step | agent-paige | pantry-pal |
|------|-------------|------------|
| Server path | `/opt/agentpaige` | `/opt/pantry-pal` |
| Nginx install | `cp deploy/nginx/*.conf /opt/nginx/conf.d/` | Same |
| Nginx reload | `cd /opt/nginx && docker compose exec nginx …` | Same |
| Network | `app-network` external | Same |
| Host port | `3000:3000` (legacy) | `expose: 3000` only (no conflict with agent-paige) |
| Pre-deploy tests | npm test + ephemeral Postgres | TODO (add before prod traffic) |