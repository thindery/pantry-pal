-- Migration: Product cache for barcode lookups (Postgres)

CREATE TABLE IF NOT EXISTS product_cache (
    barcode TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    image_url TEXT,
    ingredients TEXT,
    nutrition TEXT,
    source TEXT NOT NULL,
    info_last_synced TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_cache_barcode ON product_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_product_cache_updated_at ON product_cache(updated_at);