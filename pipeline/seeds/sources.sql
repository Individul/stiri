-- Surse initiale de stiri din R. Moldova (limba romana).
-- Feed-urile RSS au fost verificate la 2026-09-06 (numar de articole in feed la momentul verificarii).
-- Agora e dezactivata: nu are un feed RSS public functional gasit. Vezi README pentru
-- cum se adauga/dezactiveaza surse.
INSERT OR IGNORE INTO sources (name, site_url, feed_url, enabled) VALUES
('Ziarul de Gardă', 'https://www.zdg.md', 'https://www.zdg.md/feed/', 1),
('TV8', 'https://tv8.md', 'https://tv8.md/feed/', 1),
('NewsMaker', 'https://newsmaker.md', 'https://newsmaker.md/ro/feed/', 1),
('Unimedia', 'https://unimedia.info', 'https://unimedia.info/ro/rss/all/', 1),
('Deschide.md', 'https://deschide.md', 'https://deschide.md/rss.xml', 1),
('IPN', 'https://ipn.md', 'https://ipn.md/rss', 1),
('Moldova1', 'https://moldova1.md', 'https://moldova1.md/rss', 1),
('Agora', 'https://agora.md', 'https://agora.md/rss', 0);
