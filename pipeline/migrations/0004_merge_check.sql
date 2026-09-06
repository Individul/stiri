-- Reunificarea intarziata: cozile proceseaza articolele in paralel, iar Vectorize e
-- eventual-consistent, deci doua articole despre acelasi eveniment pot fi grupate in
-- aceeasi secunda fara sa se "vada" reciproc. Marcam ce cluster a fost deja re-verificat.
ALTER TABLE clusters ADD COLUMN merge_checked_at TEXT;

CREATE INDEX idx_clusters_merge_check ON clusters(merge_checked_at);
