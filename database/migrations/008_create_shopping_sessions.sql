-- Migration: Shopping session tables (Postgres)

CREATE TABLE IF NOT EXISTS shopping_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    store_name TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    total_amount DECIMAL(10, 2) DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_items (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES shopping_sessions(id) ON DELETE CASCADE,
    barcode TEXT,
    name TEXT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    unit TEXT,
    price DECIMAL(10, 2),
    category TEXT,
    added_at TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_receipts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES shopping_sessions(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    notes TEXT,
    captured_at TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shopping_sessions_user_id ON shopping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_sessions_status ON shopping_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_items_session_id ON session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_session_receipts_session_id ON session_receipts(session_id);