# Deployment Guide - Railway

Complete deployment workflow for Pantry Pal to Railway.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Railway Project Setup](#railway-project-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Migration](#database-migration)
6. [Domain Configuration](#domain-configuration)
7. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Railway CLI installed: `npm install -g @railway/cli`
- [ ] Railway account and login: `railway login`
- [ ] GitHub repository connected to Railway
- [ ] Production Clerk keys ready
- [ ] Production Stripe keys ready (if using subscriptions)
- [ ] Local dev fully tested: `npm run dev`

---

## Railway Project Setup

### 1. Create Railway Project

```bash
# Login to Railway
railway login

# Link to your project (if already created in dashboard)
railway link

# Or create new project
railway init
```

### 2. Provision PostgreSQL Database

In Railway Dashboard:
1. Go to your project
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway will auto-provision and set `DATABASE_URL`

---

## Backend Deployment (pantry-pal-api)

### 1. Configure Backend Service

In Railway Dashboard:
1. Click "New" → "Service" → "GitHub Repo"
2. Select your `pantry-pal-api` repository
3. Railway will auto-detect Node.js

### 2. Set Environment Variables

Add these in Railway Dashboard → Variables:

```bash
# Server
NODE_ENV=production
PORT=3000
DB_TYPE=postgres

# Railway provides DATABASE_URL automatically
# Don't override DATABASE_URL - it's set by Railway

# CORS - Update with your actual frontend domain
CORS_ORIGINS=https://pantry-pal-frontend.up.railway.app,https://your-custom-domain.com

# Clerk - PRODUCTION KEYS
CLERK_SECRET_KEY=sk_live_your_production_secret_key
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev

# Stripe - PRODUCTION KEYS (if using subscriptions)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Pricing IDs
STRIPE_PRICE_PRO_MONTHLY=price_live_pro_monthly
STRIPE_PRICE_PRO_YEARLY=price_live_pro_yearly

# Feature Limits
FREE_TIER_RECEIPT_SCANS=10
FREE_TIER_AI_CALLS=50
FREE_TIER_VOICE_SESSIONS=5
PRO_TIER_RECEIPT_SCANS=100
PRO_TIER_AI_CALLS=500
PRO_TIER_VOICE_SESSIONS=50
```

### 3. Deploy Backend

```bash
cd ../pantry-pal-api

# Deploy
railway up

# Check logs
railway logs
```

Railway will automatically:
- Build: `npm ci && npm run build`
- Start: `npm start`
- Run migrations on deploy (if configured)

### 4. Verify Backend Deployment

```bash
# Get backend URL
railway status

# Test health endpoint
curl https://your-backend-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "environment": "production"
}
```

---

## Frontend Deployment (pantry-pal)

### 1. Configure Frontend Service

In Railway Dashboard:
1. Click "New" → "Service" → "GitHub Repo"
2. Select your `pantry-pal` repository
3. Set as **Static Site**

### 2. Set Environment Variables

```bash
# API URL - Use your Railway backend URL
VITE_API_URL=https://your-backend-url.up.railway.app

# Clerk - PRODUCTION PUBLISHABLE KEY
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_publishable_key

# Gemini
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Build Settings

In Railway Dashboard → Settings:
- **Build Command**: `npm ci && npm run build`
- **Output Directory**: `dist`

### 4. Deploy Frontend

```bash
cd /path/to/pantry-pal

# Deploy
railway up

# Check logs
railway logs
```

---

## Database Migration

### If You Have Existing SQLite Data

1. **Export SQLite data locally:**
```bash
cd ../pantry-pal-api

# Ensure PostgreSQL is running locally for testing
npm run db:up
npm run db:migrate

# Run migration script
npm run db:migrate-sqlite
```

2. **Export from local PostgreSQL:**
```bash
# Export data
docker exec -t pantry-pal-db pg_dump -U postgres pantry_pal > backup.sql

# Or use pg_dump directly
pg_dump -h localhost -U postgres -d pantry_pal > backup.sql
```

3. **Import to Railway PostgreSQL:**
```bash
# Get Railway database connection details from dashboard
# Use Railway CLI to connect
railway connect postgres

# In another terminal, import
psql $(railway variables DATABASE_URL) < backup.sql
```

### Auto-Migration on Deploy

The backend runs migrations automatically on startup via:
- `src/db/postgres.ts` → `initializeSchema()` → `initializeSubscriptionSchema()`

Tables created:
- `pantry_items` - Inventory items
- `activities` - Activity log
- `products` - Barcode cache
- `usage_limits` - Subscription tracking
- `subscriptions` - Stripe subscriptions

---

## Domain Configuration

### Custom Domain (Optional)

1. In Railway Dashboard → Settings → Domains
2. Click "Add Custom Domain"
3. Enter your domain: `pantry-pal.yourdomain.com`
4. Follow DNS instructions (CNAME record)
5. Update `CORS_ORIGINS` in backend with new domain

### Environment Variables Update

After setting custom domain, update:

**Backend CORS:**
```bash
CORS_ORIGINS=https://pantry-pal-frontend.up.railway.app,https://pantry-pal.yourdomain.com
```

**Frontend API URL (if using custom domain):**
```bash
VITE_API_URL=https://pantry-pal-api.up.railway.app
```

Redeploy both services after domain changes.

---

## Post-Deployment Verification

### Quick Verification Checklist

```bash
# 1. Backend Health
curl https://your-backend.up.railway.app/health

# 2. API Info
curl https://your-backend.up.railway.app/

# 3. Frontend Loads
open https://your-frontend.up.railway.app
```

### Manual Testing Checklist

- [ ] Frontend loads without errors
- [ ] Can sign in with Clerk
- [ ] Can add a pantry item
- [ ] Can view activity log
- [ ] Can update/delete items
- [ ] Receipt scanning works (if configured)
- [ ] Barcode lookup works
- [ ] Subscription page loads (if using Stripe)

### Production Monitoring

1. **Railway Dashboard:**
   - Service health
   - CPU/Memory usage
   - Deployment logs

2. **Clerk Dashboard:**
   - User sign-ins
   - Authentication errors

3. **Stripe Dashboard** (if applicable):
   - Payment events
   - Webhook deliveries

---

## Troubleshooting

### Common Issues

**CORS Errors:**
```
Access to fetch at '...' from origin '...' has been blocked
```
- Fix: Update `CORS_ORIGINS` in backend with exact frontend URL

**Database Connection Failed:**
```
Database connection failed
```
- Check `DATABASE_URL` is set
- Verify `DB_TYPE=postgres`
- Check Railway PostgreSQL is provisioned

**Build Failures:**
```
npm ERR! code ENOENT
```
- Ensure `railway.toml` or build settings are correct
- Check Node.js version (18+)

**Stripe Webhook Errors:**
- Ensure `STRIPE_WEBHOOK_SECRET` matches webhook endpoint secret
- Update webhook URL in Stripe Dashboard to Railway backend URL

### Rollback

```bash
# View previous deployments
railway history

# Rollback to previous deployment
railway rollback
```

---

## Environment Variable Reference

### Required Variables

| Variable | Backend | Frontend | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | ✅ | ❌ | Set to `production` |
| `PORT` | ✅ | ❌ | `3000` for Railway |
| `DB_TYPE` | ✅ | ❌ | `postgres` for production |
| `DATABASE_URL` | ✅ | ❌ | Auto-set by Railway |
| `CLERK_SECRET_KEY` | ✅ | ❌ | Backend Clerk key |
| `VITE_CLERK_PUBLISHABLE_KEY` | ❌ | ✅ | Frontend Clerk key |
| `VITE_API_URL` | ❌ | ✅ | Backend URL |
| `CORS_ORIGINS` | ✅ | ❌ | Allowed frontend domains |

### Optional Variables

| Variable | Backend | Frontend | Description |
|----------|---------|----------|-------------|
| `STRIPE_SECRET_KEY` | ✅ | ❌ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | ❌ | Webhook verification |
| `VITE_GEMINI_API_KEY` | ❌ | ✅ | Gemini API key |
| `SENTRY_DSN` | ✅ | ✅ | Error tracking |

---

## Deployment Checklist Summary

- [ ] Railway CLI installed and logged in
- [ ] PostgreSQL database provisioned
- [ ] Backend deployed with production env vars
- [ ] Frontend deployed with production env vars
- [ ] Custom domain configured (optional)
- [ ] CORS origins updated
- [ ] Health check passes
- [ ] Manual testing complete
- [ ] Monitoring dashboards bookmarked

---

## Resources

- [Railway Documentation](https://docs.railway.app/)
- [Clerk Production Setup](https://clerk.com/docs/production)
- [Stripe Production Checklist](https://stripe.com/docs/going-live-checklist)
