-- PP-088: Merge duplicate pantry rows, then prevent them.
-- Same user + same barcode (exact) are one product; keep the oldest row,
-- sum quantities, and repoint activities. Unbarcoded rows with the same
-- normalized name and category are merged the same way.
-- Same name with different barcodes is left alone (distinct products).

-- Repoint activities from duplicate barcoded rows onto the oldest row.
WITH ranked AS (
    SELECT
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY user_id, barcode
            ORDER BY created_at ASC, id ASC
        ) AS keep_id
    FROM pantry_items
    WHERE barcode IS NOT NULL AND barcode <> ''
),
dups AS (
    SELECT id, keep_id FROM ranked WHERE id <> keep_id
)
UPDATE activities AS a
SET item_id = d.keep_id
FROM dups AS d
WHERE a.item_id = d.id;

-- Sum quantities onto the oldest barcoded row in each group.
WITH ranked AS (
    SELECT
        id,
        quantity,
        FIRST_VALUE(id) OVER (
            PARTITION BY user_id, barcode
            ORDER BY created_at ASC, id ASC
        ) AS keep_id,
        SUM(quantity) OVER (PARTITION BY user_id, barcode) AS total_qty
    FROM pantry_items
    WHERE barcode IS NOT NULL AND barcode <> ''
),
keepers AS (
    SELECT keep_id, total_qty
    FROM ranked
    WHERE id <> keep_id
    GROUP BY keep_id, total_qty
)
UPDATE pantry_items AS i
SET quantity = k.total_qty
FROM keepers AS k
WHERE i.id = k.keep_id;

DELETE FROM pantry_items
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            FIRST_VALUE(id) OVER (
                PARTITION BY user_id, barcode
                ORDER BY created_at ASC, id ASC
            ) AS keep_id
        FROM pantry_items
        WHERE barcode IS NOT NULL AND barcode <> ''
    ) ranked
    WHERE id <> keep_id
);

-- Same treatment for unbarcoded rows that share a normalized name + category.
WITH ranked AS (
    SELECT
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY user_id, LOWER(BTRIM(name)), category
            ORDER BY created_at ASC, id ASC
        ) AS keep_id
    FROM pantry_items
    WHERE barcode IS NULL OR barcode = ''
),
dups AS (
    SELECT id, keep_id FROM ranked WHERE id <> keep_id
)
UPDATE activities AS a
SET item_id = d.keep_id
FROM dups AS d
WHERE a.item_id = d.id;

WITH ranked AS (
    SELECT
        id,
        FIRST_VALUE(id) OVER (
            PARTITION BY user_id, LOWER(BTRIM(name)), category
            ORDER BY created_at ASC, id ASC
        ) AS keep_id,
        SUM(quantity) OVER (PARTITION BY user_id, LOWER(BTRIM(name)), category) AS total_qty
    FROM pantry_items
    WHERE barcode IS NULL OR barcode = ''
),
keepers AS (
    SELECT keep_id, total_qty
    FROM ranked
    WHERE id <> keep_id
    GROUP BY keep_id, total_qty
)
UPDATE pantry_items AS i
SET quantity = k.total_qty
FROM keepers AS k
WHERE i.id = k.keep_id;

DELETE FROM pantry_items
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            FIRST_VALUE(id) OVER (
                PARTITION BY user_id, LOWER(BTRIM(name)), category
                ORDER BY created_at ASC, id ASC
            ) AS keep_id
        FROM pantry_items
        WHERE barcode IS NULL OR barcode = ''
    ) ranked
    WHERE id <> keep_id
);

-- One row per user + canonical barcode (UPC-A / leading-zero EAN-13).
CREATE UNIQUE INDEX IF NOT EXISTS idx_pantry_items_user_canon_barcode
ON pantry_items (
    user_id,
    (CASE
        WHEN barcode ~ '^[0-9]+$' AND length(barcode) = 13 AND left(barcode, 1) = '0'
            THEN substring(barcode FROM 2)
        ELSE barcode
    END)
)
WHERE barcode IS NOT NULL AND barcode <> '';

-- One row per user + normalized name + category when there is no barcode.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pantry_items_user_name_category_unbarcoded
ON pantry_items (user_id, LOWER(BTRIM(name)), category)
WHERE barcode IS NULL OR barcode = '';
