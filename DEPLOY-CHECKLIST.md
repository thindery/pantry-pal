# Pantry Pal Deployment Checklist

**Ticket**: REMY-276  
**Status**: Ready for Deployment  
**Date**: 2026-04-06

---

## Files Created/Modified

### Frontend (pantry-pal/)

| File | Status | Description |
|------|--------|-------------|
| `railway.toml` | ✅ Created | Railway monorepo configuration |
| `.env.local` | ✅ Updated | Local development environment |
| `.env.production.template` | ✅ Created | Production env template |
| `README.md` | ✅ Updated | Comprehensive deployment docs |
| `DEPLOY.md` | ✅ Created | Step-by-step Railway deployment guide |

### Backend (pantry-pal-api/)

| File | Status | Description |
|------|--------|-------------|
| `src/db/postgres.ts` | ✅ Modified | Added DATABASE_URL support for Railway |
| `src/sentry.ts` | ✅ Fixed | Made Sentry optional (fixes build) |
| `scripts/migrate-sqlite-to-postgres.ts` | ✅ Created | SQLite → PostgreSQL migration script |
| `.env.local` | ✅ Updated | Local dev environment |
| `package.json` | ✅ Updated | Added migration script |

---

## Deployment Steps

### 1. Pre-Deployment

```bash
# Verify builds work locally
cd /Users/thindery/projects/pantry-pal
npm run build

cd /Users/thindery/projects/pantry-pal-api
npm run build
```

### 2. Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project (or create new)
railway link
```

### 3. Provision PostgreSQL

In Railway Dashboard:
- Project → New → Database → PostgreSQL
- Railway auto-sets `DATABASE_URL`

### 4. Deploy Backend

```bash
cd /Users/thindery/projects/pantry-pal-api
railway up
```

**Required Environment Variables** (set in Railway Dashboard):
```bash
NODE_ENV=production
PORT=3000
DB_TYPE=postgres
CLERK_SECRET_KEY=sk_live_xxx
CORS_ORIGINS=https://your-frontend.up.railway.app
```

### 5. Deploy Frontend

```bash
cd /Users/thindery/projects/pantry-pal
railway up
```

**Required Environment Variables**:
```bash
VITE_API_URL=https://your-backend.up.railway.app
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
VITE_GEMINI_API_KEY=xxx
```

### 6. Database Migration (if needed)

If migrating existing SQLite data:
```bash
cd /Users/thindery/projects/pantry-pal-api
npm run db:migrate-sqlite
```

---

## Verification Checklist

- [ ] Backend health check passes: `GET /health`
- [ ] Frontend loads without errors
- [ ] Sign in with Clerk works
- [ ] Can add pantry items
- [ ] Activities are logged
- [ ] Barcode lookup works
- [ ] API responses are under 500ms

---

## Rollback Plan

```bash
# View history
railway history

# Rollback to previous deployment
railway rollback
```

---

## Notes

1. **Local dev still works**: `npm run dev` in both folders
2. **Database**: SQLite for local, PostgreSQL for production
3. **CORS**: Must update with actual Railway URLs after deploy
4. **Clerk**: Switch from test keys to production keys before going live
5. **Stripe**: Optional - only needed if using subscriptions

---

## Links

- **Frontend Repo**: `/Users/thindery/projects/pantry-pal`
- **Backend Repo**: `/Users/thindery/projects/pantry-pal-api`
- **Documentation**: See `DEPLOY.md` for full details
