-- Surse initiale de stiri din R. Moldova (limba romana).
-- ATENTIE: URL-urile RSS trebuie verificate la instalare — unele site-uri pot avea
-- alt path RSS sau feed lipsa. Vezi README pentru cum se adauga/dezactiveaza surse.
INSERT OR IGNORE INTO sources (name, site_url, feed_url) VALUES
('Agora', 'https://agora.md', 'https://agora.md/rss'),
('Ziarul de Gardă', 'https://www.zdg.md', 'https://www.zdg.md/feed/'),
('NewsMaker', 'https://newsmaker.md', 'https://newsmaker.md/rom/feed/'),
('TV8', 'https://tv8.md', 'https://tv8.md/feed/'),
('Unimedia', 'https://unimedia.info', 'https://unimedia.info/rss/'),
('Deschide.md', 'https://deschide.md', 'https://deschide.md/rss/'),
('IPN', 'https://www.ipn.md', 'https://www.ipn.md/ro/rss'),
('Moldova1', 'https://moldova1.md', 'https://moldova1.md/feed');
