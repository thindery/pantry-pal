# Pantry-Pal Production Deployment - Quick Start

## 🚀 Your 30-Minute Deployment Path to Production Confidence

This is the executive summary. For full details, see [REMY-037-PRODUCTION-DEPLOYMENT-GUIDE.md](./REMY-037-PRODUCTION-DEPLOYMENT-GUIDE.md)

---

## Phase 1: Setup (One-Time, ~20 minutes)

### 1.1 Create Accounts

| Service | Sign Up | Purpose |
|---------|---------|---------|
| Vercel | vercel.com | React app hosting |
| Railway | railway.app | API + PostgreSQL |
| Sentry | sentry.io | Error monitoring |
| Clerk (done) | clerk.dev | Auth |
| Stripe (done) | stripe.com | Payments |

### 1.2 Configure Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login (browser auth)
railway login

# Create project
railway init --name pantry-pal

# Create databases
railway add --database postgres
# Do this twice: once for production, once for staging
```

### 1.3 Set Environment Variables (Railway Dashboard)

**Production Service Variables:**
```
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY=sk_live_...
SENTRY_DSN=https://...@sentry.io/...
CORS_ORIGINS=https://pantry-pal.app
```

### 1.4 Configure Vercel Project

1. Import GitHub repo
2. Set framework preset: `Vite`
3. Add env vars:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_SENTRY_DSN=https://...@sentry.io/...
   ```

### 1.5 Configure GitHub Secrets

**Settings → Secrets → Actions:**

| Secret | How to Get |
|--------|-----------|
| `RAILWAY_PROD_TOKEN` | Railway → Account → Tokens |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Project Settings → General |
| `VERCEL_PROJECT_ID` | Project Settings → General |

---

## Phase 2: Deploy Pipeline (~10 minutes)

### 2.1 Push Workflow File

```bash
# Already created in .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit -m "ci: add production deployment pipeline"
git push
```

### 2.2 Git Branch Setup

```bash
# Create develop branch
git checkout -b develop
git push -u origin develop

# Branch protection (do in GitHub UI)
# Settings → Branches → Add rule for `main`
# - Require pull request reviews before merging
# - Require status checks to pass
# - Restrict pushes that create files
```

### 2.3 Link Railway to GitHub

Railway Dashboard → Service → Settings → Source
- Select your GitHub repo
- Auto-deploy from `main` branch

---

## Phase 3: First Deploy (Test on Staging)

### 3.1 Deploy Backend to Staging

```bash
# Push to develop triggers staging deploy
git checkout develop
git merge main  # or latest feature
git push origin develop

# Watch in Railway dashboard
```

### 3.2 Verify Backend

```bash
curl https://your-staging-url.up.railway.app/health
# Should return {"status": "healthy", ...}
```

### 3.3 Deploy Frontend

Vercel automatically deploys from `develop` branch as preview.

Access at: `https://pantry-pal-git-develop-username.vercel.app`

### 3.4 Smoke Tests

- [ ] Can log in with Clerk
- [ ] Can add an item
- [ ] Can scan a receipt
- [ ] No errors in Sentry
- [ ] No errors in Railway logs

---

## Phase 4: Production Deploy

### 4.1 Create Pull Request

```bash
git checkout main
git pull origin main
git checkout -b release/v1.0.0
git merge develop
git push origin release/v1.0.0

# Open PR to main on GitHub
```

### 4.2 Merge to Production

1. Create PR: `develop` → `main`
2. Get approval
3. Click **Merge** → This triggers deployment

### 4.3 Watch Deploy

GitHub Actions will:
1. Run tests
2. Deploy backend to Railway
3. Deploy frontend to Vercel
4. Run health checks

**Monitor:**
- Railway Dashboard → Deployments
- GitHub Actions → Deploy Pipeline
- Sentry → Issues (should be empty!)

### 4.4 Verify Production

```bash
# Health check
curl https://api.pantry-pal.com/health

# Smoke test
curl https://api.pantry-pal.com/api/items \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Emergency Procedures

### 🔥 Site Down

```bash
# 1. Check status
railway status

# 2. View logs
railway logs

# 3. Quick rollback via GitHub
# Go to PR → Revert → Merge
# Or: git revert HEAD --no-edit && git push

# 4. Database rollback (if needed)
# Railway Dashboard → Database → Backups → Restore
```

### 💾 Database Rollback

```bash
./scripts/rollback.sh BACKUP_ID

# Find backup ID:
railway database backup list
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Railway (Starter + Postgres) | ~$20 |
| Vercel Pro | $20 |
| Sentry (Developer) | Free |
| Clerk (Free tier) | Free |
| **TOTAL** | **~$40/month** |

---

## Files Created

```
pantry-pal/
├── .github/workflows/deploy.yml       # CI/CD pipeline
├── scripts/
│   ├── migrate-safe.sh                # Safe DB migration
│   ├── rollback.sh                    # Emergency rollback
│   └── verify-db.sh                   # Data integrity checks
├── tests/load/
│   └── k6-test.js                     # Load testing
├── src/utils/sentry.ts                # Error monitoring
└── docs/
    ├── REMY-037-PRODUCTION-DEPLOYMENT-GUIDE.md  # Full guide
    └── DEPLOYMENT-QUICKSTART.md               # This file

pantry-pal-api/
├── src/sentry.ts                      # Backend error monitoring
├── src/db/migrations/
│   ├── TEMPLATE_safe_migration.sql   # Safe migration template
│   └── 003_add_user_preferences.sql.example  # Example migration
└── .env.production.template           # Production env template
```

---

## Success Checklist

Before announcing launch:

- [ ] Staging deploy works end-to-end
- [ ] Production health check passes
- [ ] Smoke tests pass (add item, scan receipt)
- [ ] Sentry shows no errors
- [ ] Rollback tested on staging
- [ ] Team knows incident response process

**When things go wrong, refer to:**
- Full guide: [REMY-037-PRODUCTION-DEPLOYMENT-GUIDE.md](./REMY-037-PRODUCTION-DEPLOYMENT-GUIDE.md)
- Emergency card: Section "Quick Reference Card" in full guide
- Railway docs: docs.railway.com
- Vercel docs: vercel.com/docs

---

**You now have everything for 100% confident production deployment.** 🚀
