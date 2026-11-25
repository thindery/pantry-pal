-- PP-164: weekly-ad hub (v1 link-out). Data-driven store directory.
-- Add a new area by inserting rows; no code change needed.
--   kind = 'local'    : shown when the visitor's ZIP starts with one of zip_prefixes
--   kind = 'fallback' : national weekly-ad store finders, shown when no local row matches
-- weekly_ad_url must be the store's own official weekly-ad page. No scraping, no partner APIs.

CREATE TABLE IF NOT EXISTS weekly_ad_stores (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL DEFAULT 'local' CHECK (kind IN ('local', 'fallback')),
    chain TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    zip_prefixes TEXT[] NOT NULL DEFAULT '{}',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    weekly_ad_url TEXT NOT NULL CHECK (weekly_ad_url LIKE 'https://%'),
    store_url TEXT,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_ad_stores_prefixes ON weekly_ad_stores USING GIN (zip_prefixes);

-- Seed: Tylor's Springfield, MO area (ZIP prefixes 656, 657, 658). Links checked 2026-11-25.
INSERT INTO weekly_ad_stores (id, kind, chain, name, address, city, state, zip, zip_prefixes, lat, lng, weekly_ad_url, store_url, note, sort_order) VALUES
('sgf-aldi', 'local', 'ALDI', 'ALDI (Springfield-area stores)', NULL, 'Springfield', 'MO', NULL, ARRAY['656','657','658'], NULL, NULL,
 'https://www.aldi.us/weekly-specials/our-weekly-ads/', 'https://www.aldi.us/stores/', 'Pick your store on the ALDI page to see its ad.', 10),
('sgf-walmart-2221', 'local', 'Walmart', 'Walmart Supercenter #2221 (E Independence St)', '2021 E Independence St', 'Springfield', 'MO', '65804', ARRAY['656','657','658'], NULL, NULL,
 'https://www.walmart.com/store/2221-springfield-mo/weekly-ads', 'https://www.walmart.com/store/2221-springfield-mo', NULL, 20),
('sgf-walmart-444', 'local', 'Walmart', 'Walmart Supercenter #444 (S Campbell Ave)', '3315 S Campbell Ave', 'Springfield', 'MO', '65807', ARRAY['656','657','658'], NULL, NULL,
 'https://www.walmart.com/store/444-springfield-mo/weekly-ads', 'https://www.walmart.com/store/444-springfield-mo', NULL, 21),
('sgf-walmart-179', 'local', 'Walmart', 'Walmart Supercenter #179 (W Sunshine St)', '3520 W Sunshine St', 'Springfield', 'MO', '65807', ARRAY['656','657','658'], NULL, NULL,
 'https://www.walmart.com/store/179-springfield-mo/weekly-ads', 'https://www.walmart.com/store/179-springfield-mo', NULL, 22),
('sgf-walmart-86', 'local', 'Walmart', 'Walmart Supercenter #86 (N Kansas Expy)', '2825 N Kansas Expy', 'Springfield', 'MO', '65803', ARRAY['656','657','658'], NULL, NULL,
 'https://www.walmart.com/store/86-springfield-mo/weekly-ads', 'https://www.walmart.com/store/86-springfield-mo', NULL, 23),
('sgf-king-food-saver', 'local', 'King Food Saver', 'King Food Saver', '335 N Nolting Ave', 'Springfield', 'MO', '65802', ARRAY['656','657','658'], NULL, NULL,
 'https://www.kingfoodsaver.com/weekly-ad', 'https://www.kingfoodsaver.com/', NULL, 30),
('sgf-cash-saver-417', 'local', 'Cash Saver', 'Cash Saver 417', '2650 W Kearney St', 'Springfield', 'MO', '65803', ARRAY['656','657','658'], NULL, NULL,
 'https://www.cashsaver417.com/weekly-ad/', 'https://www.cashsaver417.com/', NULL, 40),
('sgf-harter-house', 'local', 'Harter House', 'Harter House (Republic Rd and other stores)', '1500 E Republic Rd', 'Springfield', 'MO', '65804', ARRAY['656','657','658'], NULL, NULL,
 'https://harterhouse.com/locations/republic-road/', 'https://harterhouse.com/locations/', 'Each location page has its current weekly ad.', 50),
('sgf-harter-house-eastgate', 'local', 'Harter House', 'Harter House Eastgate', '1625 S Eastgate Ave', 'Springfield', 'MO', '65809', ARRAY['656','657','658'], NULL, NULL,
 'https://harterhouseeastgate.net/ads', 'https://harterhouseeastgate.net/', 'Eastgate runs its own ad.', 51),
('national-walmart', 'fallback', 'Walmart', 'Walmart', NULL, NULL, NULL, NULL, '{}', NULL, NULL,
 'https://www.walmart.com/store/weekly-ads', NULL, 'Set your store on Walmart to see its ad.', 10),
('national-aldi', 'fallback', 'ALDI', 'ALDI', NULL, NULL, NULL, NULL, '{}', NULL, NULL,
 'https://www.aldi.us/weekly-specials/our-weekly-ads/', NULL, 'Pick your store to see its ad.', 20),
('national-kroger', 'fallback', 'Kroger', 'Kroger family of stores', NULL, NULL, NULL, NULL, '{}', NULL, NULL,
 'https://www.kroger.com/weeklyad', NULL, 'Kroger, Dillons, Fry''s, King Soopers, Ralphs and others share this ad finder.', 30)
ON CONFLICT (id) DO NOTHING;
