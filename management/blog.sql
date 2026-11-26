CREATE TABLE IF NOT EXISTS blog_posts (
 slug TEXT PRIMARY KEY,
 revision INTEGER NOT NULL,
 title TEXT NOT NULL,
 category TEXT NOT NULL,
 summary TEXT NOT NULL,
 body TEXT NOT NULL,
 cover TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 published_at TEXT
);
