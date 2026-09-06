CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_title TEXT,
  summary_md TEXT,
  category TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_count INTEGER NOT NULL DEFAULT 0,
  importance_score REAL NOT NULL DEFAULT 0
);

CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  published_at TEXT,
  excerpt TEXT,
  extracted_text TEXT,
  vector_id TEXT,
  cluster_id INTEGER REFERENCES clusters(id),
  status TEXT NOT NULL DEFAULT 'new',
  fetched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_cluster ON articles(cluster_id);
CREATE INDEX idx_articles_published ON articles(published_at);
CREATE INDEX idx_clusters_importance ON clusters(importance_score DESC);
