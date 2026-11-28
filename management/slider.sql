CREATE TABLE IF NOT EXISTS "rosse-slider-products" (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 product_ids TEXT NOT NULL,
 interval_seconds INTEGER NOT NULL DEFAULT 5 CHECK (interval_seconds BETWEEN 3 AND 15),
 autoplay INTEGER NOT NULL DEFAULT 1 CHECK (autoplay IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO "rosse-slider-products" (id,product_ids) VALUES (1,'["ds11","ds04","fl01","af01","ds09","floral-03","cj01","pl01"]');
