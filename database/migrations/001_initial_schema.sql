-- Migration: Initial PantryPal schema (Postgres)
-- Purpose: Core pantry items, activities, and client error tables

CREATE TABLE IF NOT EXISTS pantry_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    barcode TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    category TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT REFERENCES pantry_items(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('ADD', 'REMOVE', 'ADJUST', 'SHOPPING_SESSION')),
    amount REAL NOT NULL,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK(source IN ('MANUAL', 'RECEIPT_SCAN', 'VISUAL_USAGE', 'SHOPPING_SESSION')),
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_errors (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component TEXT,
    url TEXT,
    user_agent TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_pantry_items_name ON pantry_items(name);
CREATE INDEX IF NOT EXISTS idx_pantry_items_barcode ON pantry_items(barcode);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_item_id ON activities(item_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_client_errors_resolved ON client_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_client_errors_created ON client_errors(created_at);