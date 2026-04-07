-- TASK-005: SQL migration for activity types
-- Migration to add activity types table and related columns

-- Create activity_types table
CREATE TABLE IF NOT EXISTS activity_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#000000',
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default activity types
INSERT INTO activity_types (name, description, color) VALUES
    ('created', 'Item was created', '#22c55e'),
    ('updated', 'Item was updated', '#3b82f6'),
    ('deleted', 'Item was deleted', '#ef4444'),
    ('scanned', 'Barcode was scanned', '#8b5cf6'),
    ('consumed', 'Item was consumed', '#f59e0b'),
    ('restocked', 'Item was restocked', '#10b981');

-- Add activity_type_id column to activities table
ALTER TABLE activities 
    ADD COLUMN IF NOT EXISTS activity_type_id INTEGER REFERENCES activity_types(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update existing activities to have a type
UPDATE activities 
    SET activity_type_id = (SELECT id FROM activity_types WHERE name = 'created')
    WHERE activity_type_id IS NULL;
