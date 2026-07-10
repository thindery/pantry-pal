-- Migration: Activity types lookup table (Postgres, optional)

CREATE TABLE IF NOT EXISTS activity_types (
    type TEXT PRIMARY KEY,
    description TEXT
);

INSERT INTO activity_types (type, description) VALUES
    ('ADD', 'Item quantity increased'),
    ('REMOVE', 'Item quantity decreased'),
    ('ADJUST', 'Item quantity adjusted'),
    ('SHOPPING_SESSION', 'Shopping session completed')
ON CONFLICT (type) DO NOTHING;