CREATE TABLE IF NOT EXISTS home_favorites (id INTEGER PRIMARY KEY CHECK(id=1), ids TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO home_favorites (id,ids,revision) VALUES (1,'["ds09","floral-03","ds11"]',0);
