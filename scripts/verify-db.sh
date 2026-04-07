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
