-- Starea fiecarui feed, ca sa se vada in /admin de ce o sursa nu produce articole.
ALTER TABLE sources ADD COLUMN last_check_at TEXT;
ALTER TABLE sources ADD COLUMN last_status TEXT;
ALTER TABLE sources ADD COLUMN last_ok_at TEXT;
