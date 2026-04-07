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
