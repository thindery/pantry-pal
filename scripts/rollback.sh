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
