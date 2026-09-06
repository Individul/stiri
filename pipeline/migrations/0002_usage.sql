-- Consum Workers AI, agregat pe zi / pas / model, pentru urmarirea cheltuielilor.
CREATE TABLE usage (
  day TEXT NOT NULL,        -- YYYY-MM-DD (UTC)
  step TEXT NOT NULL,       -- 'embed' | 'confirm' | 'summarize'
  model TEXT NOT NULL,
  neurons REAL NOT NULL DEFAULT 0,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, step, model)
);

CREATE INDEX idx_usage_day ON usage(day);
