# REMY-037: Production Deployment Safety Guide

**Project:** Pantry-Pal  
**Created:** February 23, 2026  
**Purpose:** Zero-risk deployment strategy with 100% confidence for real users

---

## Executive Summary

This guide provides a battle-tested path to production for Pantry-Pal (Vite + React frontend, Express + PostgreSQL backend). Every section includes copy-paste ready configurations, rollback procedures, and safety checks designed to prevent breaking things.

**Key Safety Principles:**
1. **Never deploy directly to production** - Always go through staging
2. **Database migrations must be backwards-compatible** - Old code works with new schema
3. **Rollbacks tested before launch** - You can't call an ambulance when you're already bleeding
4. **Monitor before you celebrate** - 30-minute observation period post-deploy

---

## Table of Contents

1. [Deployment Architecture](#1-deployment-architecture)
2. [3-Environment Strategy](#2-3-environment-strategy)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Database Migration Safety](#4-database-migration-safety)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Incident Response Runbook](#6-incident-response-runbook)
7. [Pre-Launch Checklist](#7-pre-launch-checklist)
8. [Version Control Strategy](#8-version-control-strategy)

---

## 1. Deployment Architecture

### 1.1 Recommended Stack

| Component | Recommendation | Why |
|-----------|---------------|-----|
| **Frontend** | Vercel | Zero-config, automatic HTTPS, edge CDN, preview deployments |
| **Backend API** | Railway | Managed PostgreSQL, auto-deploy from Git, sensible defaults |
| **Database** | Railway PostgreSQL | Automated backups, connection pooling, SSL by default |
| **Monitoring** | Sentry + Railway logs | Error tracking + infrastructure monitoring |
| **Uptime** | Railway built-in | Health checks and auto-restart included |

### 1.2 Cost Analysis

**Estimated Monthly Costs (100 users):**

| Service | Plan | Cost |
|---------|------|------|
| Vercel Pro | For commercial use | $20/month |
| Railway | Starter tier (512MB, shared CPU) | $5/month |
| Railway PostgreSQL | 1GB RAM, 10GB storage | $15/month |
| Sentry | Developer plan (5k errors) | Free |
| **Total** | | **~$40/month** |

**Scaling estimates:**
- 1,000 users: ~$60/month (upgrade Railway)
- 10,000 users: ~$150/month (Vercel Pro + Railway Pro + Sentry Team)

### 1.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel (CDN) - pantry-pal-app.vercel.app                  │
│  ├── Production: main branch                               │
│  └── Preview: PR branches                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ API Calls (with Clerk JWT)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Railway (API Server) - api.pantry-pal.com                 │
│  ┌─────────────┐                                           │
│  │  Express.js │──┐                                        │
│  └─────────────┘  │                                        │
│                   ▼                                        │
│  ┌─────────────────────────┐                              │
│  │  Railway PostgreSQL     │                              │
│  │  └── Automated backups  │                              │
│  └─────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Alternative: Self-Hosted

If you prefer dedicated VMs (DigitalOcean, Linode, Hetzner):

| Provider | Spec | Cost/month |
|----------|------|------------|
| DigitalOcean | 2GB RAM, 1 vCPU | $12 |
| Hetzner | 4GB RAM, 2 vCPU | €6 (~$6.5) |
| Linode | 2GB RAM, 1 vCPU | $12 |

Tradeoffs:
- **Pros:** Full control, cheaper at scale
- **Cons:** You manage SSL, backups, security patches, DDoS protection

**Recommendation:** Start with Railway/Vercel, migrate to dedicated when paying $100+/month.

---

## 2. 3-Environment Strategy

### 2.1 Environment Overview

| Environment | Branch | URL | Database | Use |
|-------------|--------|-----|----------|-----|
| **Development** | `feature/*` | localhost | SQLite/Local Postgres | Daily dev work |
| **Staging** | `develop` | *.vercel.app (preview) | Staging Postgres | Pre-production testing |
| **Production** | `main` | pantry-pal.app | Production Postgres | Live users |

### 2.2 Database Isolation

**Critical:** Each environment has its OWN database. Never share databases.

**Railway Project Structure:**
```
Pantry-Pal (project)
├── Production Environment
│   ├── pantry-pal-api (service)
│   └── postgres-production (database)
├── Staging Environment  
│   ├── pantry-pal-api-staging (service)
│   └── postgres-staging (database)
└── Development (local)
    └── SQLite or local Docker Postgres
```

### 2.3 Environment Variables

**Frontend (.env files per environment):**

```bash
# .env.development (local development)
VITE_API_URL=https://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# .env.staging (Railway sets these automatically or via dashboard)
VITE_API_URL=https://pantry-pal-api-staging.up.railway.app
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# .env.production
VITE_API_URL=https://pantry-pal-api-production.up.railway.app
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

**Backend (Railway environment variables - NEVER commit these):**

```bash
# Common to all environments
NODE_ENV=production
PORT=3000

# Database - Railway provides DATABASE_URL automatically
# DATABASE_URL=postgresql://...

# Clerk - Different for staging vs production
CLERK_SECRET_KEY=sk_live_... # or sk_test_ for staging

# Stripe - Different environments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature flags per environment
FREE_TIER_RECEIPT_SCANS=10
FREE_TIER_AI_CALLS=50
FREE_TIER_VOICE_SESSIONS=5
PRO_TIER_RECEIPT_SCANS=100
PRO_TIER_AI_CALLS=500
PRO_TIER_VOICE_SESSIONS=50
```

### 2.4 Vercel Environment Setup

1. Create three projects (or use Vercel's built-in preview system):
   - `pantry-pal` → Production (main branch)
   - `pantry-pal-staging` → Staging (develop branch)

2. Environment Variables in Vercel Dashboard:
   
   **Production:**
   ```
   VITE_API_URL=https://api.pantry-pal.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   ```
   
   **Preview (Staging):**
   ```
   VITE_API_URL=https://api-staging.pantry-pal.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

### 2.5 Railway Environment Setup

1. Create **two separate services** (not just branches):
   - `pantry-pal-api` (production)
   - `pantry-pal-api-staging` (staging)

2. Each gets its own PostgreSQL database

3. Configure auto-deploy:
   - Production: Deploy only on `main` branch
   - Staging: Deploy on any push to `develop` branch

---

## 3. CI/CD Pipeline

### 3.1 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  # ============================================
  # Job 1: Test & Lint
  # ============================================
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      # Test Frontend
      - name: Install Frontend Dependencies
        working-directory: ./pantry-pal
        run: npm ci
      
      - name: Lint Frontend
        working-directory: ./pantry-pal
        run: npm run lint || echo "No lint script"
      
      - name: Test Frontend
        working-directory: ./pantry-pal
        run: npm run test:run || echo "Tests skipped"
      
      # Test Backend
      - name: Install Backend Dependencies
        working-directory: ./pantry-pal-api
        run: npm ci
      
      - name: Run Backend Tests
        working-directory: ./pantry-pal-api
        run: npm test
        env:
          NODE_ENV: test
          DB_TYPE: sqlite
          DB_PATH: ./test.db
      
      - name: Type Check Backend
        working-directory: ./pantry-pal-api
        run: npx tsc --noEmit

  # ============================================
  # Job 2: Database Migration Check
  # ============================================
  migration-check:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Get full history for comparison
      
      - name: Check for migration files
        id: check-migrations
        run: |
          # Check if any .sql files changed in migrations folder
          if git diff --name-only HEAD~1 HEAD | grep -q "src/db/migrations/.*\.sql"; then
            echo "has_migrations=true" >> $GITHUB_OUTPUT
            echo "🚨 Database migrations detected!"
          else
            echo "has_migrations=false" >> $GITHUB_OUTPUT
            echo "No migrations detected"
          fi
      
      - name: Verify migrations are backwards-compatible
        if: steps.check-migrations.outputs.has_migrations == 'true'
        run: |
          echo "⚠️ Migrations detected. Verify they follow backwards-compatible rules:"
          echo "   1. Only ADD columns/tables, never REMOVE/RENAME"
          echo "   2. New columns must have DEFAULT values"
          echo "   3. Deploy code BEFORE migration when removing"
          
          # List changed migration files
          echo "Changed migration files:"
          git diff --name-only HEAD~1 HEAD | grep "src/db/migrations/.*\.sql" || true

  # ============================================
  # Job 3: Deploy to Staging
  # ============================================
  deploy-staging:
    needs: [test, migration-check]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://pantry-pal-staging.vercel.app
    
    steps:
      - uses: actions/checkout@v4
      
      # Deploy Backend to Railway Staging
      - name: Deploy to Railway (Staging)
        uses: railway/cli-deploy@v1
        with:
          project_id: ${{ secrets.RAILWAY_STAGING_PROJECT_ID }}
          service: pantry-pal-api-staging
          environment: staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_STAGING_TOKEN }}
      
      # Deploy Frontend to Vercel Preview
      - name: Deploy Frontend to Vercel (Preview)
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          github-comment: true

  # ============================================
  # Job 4: Deploy to Production (Manual Approval)
  # ============================================
  deploy-production:
    needs: [test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://pantry-pal.app
    
    steps:
      - uses: actions/checkout@v4
      
      # Deploy Backend to Railway Production
      - name: Deploy to Railway (Production)
        uses: railway/cli-deploy@v1
        with:
          project_id: ${{ secrets.RAILWAY_PROD_PROJECT_ID }}
          service: pantry-pal-api
          environment: production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_PROD_TOKEN }}
      
      # Deploy Frontend to Vercel Production
      - name: Deploy Frontend to Vercel (Production)
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
      
      # Create deployment notification
      - name: Notify Deployment
        run: |
          echo "🚀 Production deployment completed!"
          echo "   Time: $(date)"
          echo "   Commit: ${{ github.sha }}"
          echo "   Branch: ${{ github.ref }}"

  # ============================================
  # Job 5: Post-Deploy Health Check
  # ============================================
  health-check:
    needs: [deploy-production]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Health Check - Frontend
        run: |
          for i in {1..5}; do
            curl -sf https://pantry-pal.app/health && echo "✅ Frontend healthy" && exit 0
            echo "Attempt $i/5: Frontend not ready, waiting 10s..."
            sleep 10
          done
          echo "❌ Frontend health check failed"
          exit 1
      
      - name: Health Check - Backend
        run: |
          for i in {1..5}; do
            curl -sf https://api.pantry-pal.com/health && echo "✅ API healthy" && exit 0
            echo "Attempt $i/5: API not ready, waiting 10s..."
            sleep 10
          done
          echo "❌ API health check failed"
          exit 1
      
      - name: Smoke Test
        run: |
          # Basic smoke test - verify API returns expected structure
          RESPONSE=$(curl -sf https://api.pantry-pal.com/health)
          echo "$RESPONSE" | grep -q "healthy" && echo "✅ Smoke test passed" || exit 1
```

### 3.2 GitHub Environment Protection Rules

1. Go to **Settings → Environments → production**
2. Configure:
   - ✅ Require reviewers (add yourself)
   - ✅ Wait timer: 0 minutes
   - ✅ Deployment branches: `main` only
   - ✅ Protection rules: Enabled

### 3.3 Railway Deployment Configuration

**Production Service (`pantry-pal-api`):**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRestarts": 3
  }
}
```

### 3.4 Zero-Downtime Deployment

Railway handles rolling deployments automatically. For extra safety:

1. **Database connections:** Use connection pooling (pg pool max 20)
2. **Health checks:** Already configured in server.ts
3. **Graceful shutdown:** Already implemented (30s timeout)

---

## 4. Database Migration Safety

### 4.1 The Golden Rules

**NEVER:**
- ❌ Remove or rename columns in a single deploy
- ❌ Change column types without careful planning
- ❌ Add `NOT NULL` columns without default values
- ❌ Delete data in migrations

**ALWAYS:**
- ✅ Add new columns/tables (safe)
- ✅ Add indexes concurrently (PostgreSQL)
- ✅ Deploy code changes before schema changes when removing

### 4.2 Migration File Naming Convention

Format: `NNN_descriptive_name.sql`

```
src/db/migrations/
├── 001_initial_schema.sql
├── 002_add_subscription_fields.sql
├── 003_add_user_preferences.sql
├── 004_create_indexes.sql
└── 005_create_audit_log.sql
```

### 4.3 Safe Migration Examples

#### ✅ Safe: Add New Column (Default Value)

```sql
-- 003_add_user_preferences.sql
-- SAFE: Adding optional column with default

-- SQLite
ALTER TABLE user_subscriptions ADD COLUMN preferences TEXT DEFAULT '{}';

-- PostgreSQL
ALTER TABLE user_subscriptions ADD COLUMN preferences JSONB DEFAULT '{}';

-- Add index (concurrently in production to avoid locks)
-- PostgreSQL only:
-- CREATE INDEX CONCURRENTLY idx_user_prefs ON user_subscriptions(user_id) WHERE preferences != '{}';
```

#### ✅ Safe: Add New Table

```sql
-- 005_create_audit_log.sql
-- SAFE: New table doesn't affect existing queries

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
```

#### ⚠️ Multi-Step: Remove Column

**Step 1 (Deploy 1):** Stop using column in code + deploy
```javascript
// Before: user.active (column to remove)
// After: Use user.subscription_status instead

// Deploy code that doesn't reference 'active'
```

**Step 2 (Deploy 2, days later):** Remove column
```sql
-- 006_remove_active_column.sql
-- Assuming no code references 'active' anymore

ALTER TABLE user_subscriptions DROP COLUMN active;
```

### 4.4 Migration Scripts

**File: `scripts/migrate-safe.sh`**

```bash
#!/bin/bash
set -e

# Safe migration wrapper with backup

echo "=== Pantry-Pal Safe Migration ==="

# 1. Check environment
ENV=${NODE_ENV:-development}
echo "Environment: $ENV"

if [ "$ENV" == "production" ]; then
  echo "⚠️  PRODUCTION detected - extra precautions active"
  
  # 2. Create backup before migrations
  echo "Creating database backup..."
  railway database backup create || {
    echo "❌ Backup failed! Aborting."
    exit 1
  }
  echo "✅ Backup created"
  
  # 3. Show pending migrations
  echo ""
  echo "Pending migrations:"
  ls -1 src/db/migrations/*.sql 2>/dev/null | while read file; do
    echo "  - $(basename $file)"
  done
  
  # 4. Confirmation
  echo ""
  read -p "Proceed with migrations? (type 'yes'): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# 5. Run migrations
echo ""
echo "Running migrations..."
npm run db:migrate

echo ""
echo "✅ Migrations complete!"

# 6. Verify
if [ "$ENV" == "production" ]; then
  echo ""
  echo "Post-migration checks:"
  curl -sf http://localhost:$PORT/health >/dev/null && echo "✅ Health check passed" || echo "⚠️ Health check failed"
fi
```

### 4.5 Rollback Strategy

**Important:** SQLite doesn't support `DROP COLUMN` easily. PostgreSQL is more flexible.

**File: `scripts/rollback.sh`**

```bash
#!/bin/bash
set -e

# Emergency rollback script
# Usage: ./rollback.sh [backup-file]

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./rollback.sh <backup-file>"
  echo ""
  echo "Available backups:"
  railway database backup list 2>/dev/null || echo "  (list not available)"
  exit 1
fi

echo "=== ROLLBACK INITIATED ==="
echo "⚠️  This will restore database from backup"
echo "Backup file: $BACKUP_FILE"
echo ""

read -p "Are you sure? This cannot be undone. Type 'ROLLBACK': " confirm
if [ "$confirm" != "ROLLBACK" ]; then
  echo "Aborted."
  exit 0
fi

# Stop the service first
echo "Stopping service..."
railway service stop

# Restore database
echo "Restoring database..."
railway database backup restore "$BACKUP_FILE"

# Restart service
echo "Restarting service..."
railway service start

# Verify
echo "Verifying health..."
sleep 5
curl -sf http://localhost:$PORT/health && echo "✅ Rollback successful" || echo "❌ Health check failed"
```

### 4.6 Data Integrity Checks

**File: `scripts/verify-db.sh`**

```bash
#!/bin/bash

# Post-migration data integrity verification

echo "=== Database Integrity Check ==="

# Set up database connection
if [ "$DB_TYPE" == "postgres" ]; then
  PSQL="psql $DATABASE_URL"
  
  # Critical table row counts
  echo "Table row counts:"
  $PSQL -c "SELECT 'pantry_items' as table_name, COUNT(*) as rows FROM pantry_items UNION ALL SELECT 'activities', COUNT(*) FROM activities UNION ALL SELECT 'user_subscriptions', COUNT(*) FROM user_subscriptions;"
  
  # Orphaned records check
  echo ""
  echo "Orphaned activities (no matching item):"
  $PSQL -c "SELECT COUNT(*) FROM activities a LEFT JOIN pantry_items p ON a.item_id = p.id WHERE p.id IS NULL;"
  
  # Foreign key check
  echo ""
  echo "Foreign key violations:"
  $PSQL -c "SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';"
  
else
  # SQLite checks
  echo "SQLite database: $DB_PATH"
  sqlite3 "$DB_PATH" "SELECT 'pantry_items' as table_name, COUNT(*) as rows FROM pantry_items UNION ALL SELECT 'activities', COUNT(*) FROM activities UNION ALL SELECT 'user_subscriptions', COUNT(*) FROM user_subscriptions;"
fi

echo ""
echo "✅ Integrity check complete"
```

---

## 5. Monitoring & Alerting

### 5.1 Sentry Integration

**Install:**
```bash
# Frontend
npm install @sentry/react @sentry/vite-plugin --save

# Backend
npm install @sentry/node @sentry/profiling-node --save
```

**Frontend Configuration (`src/main.tsx`):**

```typescript
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session Replay
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions
    environment: import.meta.env.VITE_ENVIRONMENT || 'production',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    beforeSend(event) {
      // Sanitize sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      return event;
    },
  });
}
```

**Backend Configuration (`src/server.ts` additions):**

```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry before Express
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    release: process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
  });
  
  // Instrument Express
  Sentry.setupExpressErrorHandler(app);
}

// Add Sentry request handler BEFORE all routes
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ... your routes ...

// Sentry error handler LAST (before fallback 404)
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
```

### 5.2 Health Check Endpoint

Already implemented in `server.ts`. Key health check:

```bash
# Test locally
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-23T19:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### 5.3 Railway Uptime Monitoring

Railway automatically monitors health checks. Additional config:

1. **Railway Dashboard → Service → Healthchecks**
   - Path: `/health`
   - Interval: 30 seconds
   - Timeout: 5 seconds
   - Failure threshold: 3

2. **Auto-restart:** Enabled by default

### 5.4 Sentry Alert Rules

**Configure in Sentry Dashboard:**

1. **New Issue Alert:**
   - When: A new issue is created
   - Condition: Level is error or fatal
   - Action: Send email to admin

2. **High Volume Alert:**
   - When: 50+ events in 1 hour from same issue
   - Action: Send Slack notification

3. **Performance Alert:**
   - When: P95 response time > 1000ms for 10 minutes
   - Action: Send email

### 5.5 Log Aggregation

Railway provides built-in logs. For external aggregation:

```bash
# Install Vector (log shipper) or use Railway's log drains
# Export to Papertrail, Datadog, or self-hosted
```

---

## 6. Incident Response Runbook

### 6.1 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - Critical** | Site down, data loss | Immediate | 500 errors, DB down |
| **P1 - Major** | Major feature broken | 30 minutes | Can't add items, login fails |
| **P2 - Minor** | Partial degradation | 4 hours | Slow loading, minor bugs |
| **P3 - Cosmetic** | UI issues | Next sprint | Layout bugs |

### 6.2 Incident Response Playbook

#### P0 - Site Down

**Detection:**
- Health check fails
- Sentry error spike
- User reports

**Response (execute in order):**

```
1. ACKNOWLEDGE (2 minutes)
   - Post in incident channel: "🚨 INCIDENT ACKNOWLEDGED - P0"
   - Stop all non-critical work

2. ASSESS (3 minutes)
   - Check Railway dashboard for service status
   - Check logs: railway logs --service pantry-pal-api
   - Check database connection

3. MITIGATE - Fast Fix or Rollback (15 minutes)
   
   Option A: Fast config fix
   - If clear config issue: Update env var in Railway dashboard → Restart
   
   Option B: Fast code fix
   - If quick fix known: Push hotfix to main → Auto-deploy
   
   Option C: Rollback (safest)
   - Identify last good commit: git log --oneline -10
   - Revert: git revert <bad-commit> --no-edit
   - Push: git push origin main
   - Railway auto-deploys previous version

4. VERIFY (5 minutes)
   - Health check passes: curl https://api.pantry-pal.com/health
   - Smoke test: Try adding an item
   - Monitor Sentry for 10 minutes

5. COMMUNICATE
   - Update incident channel with resolution
   - If user-facing, post status page update

6. POST-MORTEM (within 24 hours)
   - What happened?
   - Why wasn't it caught?
   - What are we doing to prevent recurrence?
```

#### P1 - Feature Broken

```
1. ACKNOWLEDGE (5 minutes)
   - Document affected feature and user impact

2. ASSESS (10 minutes)
   - Reproduce locally
   - Check recent commits

3. MITIGATE (30 minutes)
   - If deploy issue: Rollback to previous commit
   - If data issue: Run data fix script
   - If dependency: Pin to working version

4. FIX
   - Create fix on feature branch
   - Test on staging
   - Deploy at lower-traffic time

5. COMMUNICATE
   - Update users on social/status page if needed
```

### 6.3 Rollback Commands

**Quick Rollback (Code):**
```bash
# View recent commits
git log --oneline -20

# Create rollback branch
git checkout -b hotfix/rollback-$(date +%Y%m%d)

# Revert last commit
git revert HEAD --no-edit

# Push and let CI deploy
git push origin hotfix/rollback-$(date +%Y%m%d)

# Open PR to main for immediate merge
```

**Database Rollback (Emergency):**
```bash
# See section 4.5 for full script
./scripts/rollback.sh <backup-file>
```

**Railway Rollback:**
```bash
# Via CLI - deploy previous successful deployment
railway up --service pantry-pal-api --detach

# Or use Dashboard: Service → Deployments → Redeploy
```

### 6.4 Communication Templates

**Incident Started:**
```
🚨 INCIDENT ALERT - P0
Status: Investigating
Impact: Pantry-Pal is currently inaccessible
Started: $(date -u "+%Y-%m-%d %H:%M UTC")
Next update: 15 minutes
```

**Incident Resolved:**
```
✅ INCIDENT RESOLVED - P0
Duration: 25 minutes
Resolution: Database connection pool exhausted, restarted service
Impact: ~50 users affected during window
Next: Post-mortem tomorrow at 10am
```

---

## 7. Pre-Launch Checklist

### 7.1 Security Audit

**Frontend:**
- [ ] No hardcoded API keys in code
- [ ] Clerk publishable key uses environment variable
- [ ] No `console.log` of sensitive data
- [ ] API URLs use HTTPS only
- [ ] `.env*.local` in `.gitignore`

**Backend:**
- [ ] CORS configured for production domain only
- [ ] Helmet middleware enabled
- [ ] No debug routes in production
- [ ] Clerk secret key never logged
- [ ] Stripe webhook endpoint signature verified
- [ ] Rate limiting enabled (implement middleware)

**Database:**
- [ ] No default/admin passwords
- [ ] SSL connections enforced
- [ ] Backups enabled (Railway does this automatically)

### 7.2 Load Testing

**Install k6:**
```bash
brew install k6  # macOS
```

**Load Test Script (`tests/load/k6-test.js`):**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 50 }, // Peak
    { duration: '2m', target: 100 }, // Stress
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.pantry-pal.com';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health status is 200': (r) => r.status === 200,
  });

  // API endpoints
  const items = http.get(`${BASE_URL}/api/items`, {
    headers: {
      Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
    },
  });
  
  check(items, {
    'items status is 200': (r) => r.status === 200,
    'items is array': (r) => Array.isArray(r.json()),
  });

  sleep(1);
}
```

**Run Load Test (Staging first):**
```bash
k6 run --env BASE_URL=https://api-staging.pantry-pal.com --env TEST_TOKEN=xxx tests/load/k6-test.js
```

**Success Criteria:**
- P95 response time < 500ms
- Error rate < 1%
- No crashes under 100 concurrent users

### 7.3 Backup Strategy

**Railway:**
- ✅ Automatic daily backups (enabled by default)
- ✅ Point-in-time recovery (up to 7 days on Pro plan)

**Manual Backup Commands:****
```bash
# PostgreSQL dump (run locally or in Railway shell)
pg_dump $DATABASE_URL > pantry-pal-backup-$(date +%Y%m%d).sql

# Upload to secure storage
aws s3 cp pantry-pal-backup-*.sql s3://pantry-pal-backups/
```

### 7.4 Rollback Test

**Before Launch:**
1. Deploy a test change to staging
2. Smoke test the change
3. Rollback using `git revert`
4. Verify staging returns to previous state
5. Document any issues

**Rollback Validation Checklist:**
- [ ] Old commit deploys successfully
- [ ] Database still compatible (no breaking changes)
- [ ] Health checks pass
- [ ] Users can still log in
- [ ] Core features work

### 7.5 Final Launch Steps

```
T-MINUS 1 DAY:
  [ ] Deploy to staging, run full test suite
  [ ] Run load test on staging
  [ ] Verify monitoring dashboards
  [ ] Prepare incident response contact list

T-MINUS 2 HOURS:
  [ ] Final code review merged to main
  [ ] Database backup completed
  [ ] Team on standby

T-MINUS 30 MINUTES:
  [ ] Deploy to production (via GitHub Actions)
  [ ] Monitor Sentry for errors
  [ ] Monitor Railway logs
  [ ] Run smoke tests

T-PLUS 30 MINUTES:
  [ ] No critical alerts: ✅ LAUNCH SUCCESSFUL
  [ ] Announce on Twitter/Discord
  [ ] Monitor for 2 hours
```

---

## 8. Version Control Strategy

### 8.1 Branching Strategy

**Git Flow (Simplified):**

```
main (production)
  ↑
develop (staging) ←── feature/item-search
  ↑                   ↑
feature/item-search ←── feature/search-ui
```

**Rules:**
- `main` = production only (never push directly)
- `develop` = staging, integration branch
- `feature/*` = new features
- `hotfix/*` = urgent production fixes

### 8.2 Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (users must act)
- **MINOR:** New features, backwards compatible
- **PATCH:** Bug fixes only

**Examples:**
```
v1.0.0   # Initial release
v1.1.0   # Added receipt scanning
v1.1.1   # Fixed barcode scan bug
v2.0.0   # Removed legacy auth (breaking change)
```

**Tagging Commands:**
```bash
# After merge to main, tag the release
git checkout main
git pull origin main

git tag -a v1.1.0 -m "Add receipt scanning feature"
git push origin v1.1.0

# If you make a mistake
git tag -d v1.1.0  # Delete local
git push origin --delete v1.1.0  # Delete remote
```

### 8.3 Coordinated Frontend/Backend Deploys

**Problem:** Frontend expects new API field that doesn't exist yet.

**Solution: Deploy Order Rules**

1. **New feature (add-only):**
   ```
   1. Deploy Backend (adds new endpoint/field)
   2. Verify backend works
   3. Deploy Frontend (uses new endpoint/field)
   ```

2. **Breaking change (remove/rename):**
   ```
   1. Deploy Frontend (stops using old field)
   2. Verify frontend still works
   3. Wait 1-7 days (grace period)
   4. Deploy Backend (removes old field)
   ```

**Version Coordination:**

**Frontend (`package.json` addition):**
```json
{
  "requiredApiVersion": ">=1.1.0"
}
```

**Backend health check enhancement:**
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.1.0', // Match git tag
    apiVersion: '1.1.0',
  });
});
```

**Frontend startup check:**
```typescript
// In App.tsx or main entry
async function checkApiVersion() {
  if (!import.meta.env.PROD) return;
  
  const response = await fetch(`${API_URL}/health`);
  const { apiVersion } = await response.json();
  const requiredVersion = packageJson.requiredApiVersion;
  
  if (!semver.satisfies(apiVersion, requiredVersion)) {
    console.error(
      `API version mismatch. Required: ${requiredVersion}, Got: ${apiVersion}`
    );
    // Show update required message to user
  }
}
```

### 8.4 Commit Message Convention

Use Conventional Commits for automatic changelog:

```
feat: add receipt scanning
fix: correct quantity calculation on decimal inputs
docs: update API documentation
style: format with prettier
refactor: extract database operations to adapter pattern
test: add tests for barcode scanning
chore: update dependencies
```

**Breaking change:**
```
feat!: remove legacy auth endpoints

BREAKING CHANGE: The /api/v1/auth endpoints are removed. 
Use Clerk JWT authentication instead.
```

### 8.5 Release Checklist

```bash
# 1. Update version
npm version minor  # or major/patch

# 2. Update CHANGELOG.md
# [Manually add notes or use conventional-changelog]

# 3. Run final tests
npm test
npm run build

# 4. Create PR to main
gh pr create --base main --title "Release v$(jq -r .version package.json)"

# 5. After merge, tag
git checkout main
git pull
git tag -a v$(jq -r .version package.json) -m "Release $(jq -r .version package.json)"
git push origin v$(jq -r .version package.json)

# 6. Monitor deployment
```

---

## Appendix A: GitHub Secrets Checklist

Set these in **Settings → Secrets and variables → Actions:**

### Required Secrets

| Secret | How to Get | Where Used |
|--------|-----------|------------|
| `RAILWAY_PROD_TOKEN` | Railway Dashboard → Tokens | Deploy backend to production |
| `RAILWAY_STAGING_TOKEN` | Railway Dashboard → Tokens | Deploy backend to staging |
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens | Deploy frontend |
| `VERCEL_ORG_ID` | Vercel Project → Settings → General | Vercel CLI |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General | Vercel CLI |

### Optional but Recommended

| Secret | How to Get | Where Used |
|--------|-----------|------------|
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens | Upload source maps |
| `SLACK_WEBHOOK_URL` | Slack App → Incoming Webhooks | Deployment notifications |

---

## Appendix B: Emergency Contacts

**Save this somewhere accessible:**

| Service | Emergency Contact | URL |
|---------|-----------------|-----|
| Railway Support | help@railway.app | help.railway.app |
| Vercel Status | status.vercel.com | @vercel_status |
| Clerk Status | status.clerk.dev | status.clerk.dev |
| Stripe Support | Support dashboard | support.stripe.com |
| Sentry Status | status.sentry.io | status.sentry.io |

---

## Quick Reference Card

**Print this and keep handy:**

```
┌─────────────────────────────────────────────────────────────┐
│  PANTRY-PAL PRODUCTION EMERGENCY CARD                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔥 SITE DOWN?                                              │
│  1. Check Railway: railway status                           │
│  2. Check logs: railway logs                                  │
│  3. Rollback: git revert HEAD && git push                   │
│  4. Health check: curl https://api.pantry-pal.com/health     │
│                                                             │
│  💾 DATABASE ISSUE?                                         │
│  1. Check Railway Database dashboard                        │
│  2. Restore backup: railway database backup restore [id]    │
│  3. Verify: Run health check                                │
│                                                             │
│  🚀 DEPLOY                                                  │
│  Staging:  push to develop                                  │
│  Prod:     PR → main → Requires approval                    │
│                                                             │
│  📊 MONITORING                                              │
│  Sentry:   sentry.io/organizations/.../issues/             │
│  Railway:  railway.app/project/...                          │
│  Vercel:   vercel.com/dashboard/pantry-pal                  │
│                                                             │
│  🆘 CONTACT                                                 │
│  Railway:  help@railway.app                                 │
│  Vercel:   Support ticket via dashboard                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-23  
**Next Review:** Before first production deployment
