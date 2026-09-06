-- Surse de stiri din R. Moldova (limba romana).
-- Feed-urile au fost verificate (200 + articole in feed) la 2026-09-06.
-- Idempotent: INSERT OR IGNORE pe feed_url (UNIQUE), deci se poate rula oricand.
-- Sursele se pot administra si din pagina protejata /admin a site-ului.
INSERT OR IGNORE INTO sources (name, site_url, feed_url, enabled) VALUES
-- generaliste
('Ziarul de Gardă',  'https://www.zdg.md',          'https://www.zdg.md/feed/',            1),
('TV8',              'https://tv8.md',              'https://tv8.md/feed/',                1),
('NewsMaker',        'https://newsmaker.md',        'https://newsmaker.md/ro/feed/',       1),
('Unimedia',         'https://unimedia.info',       'https://unimedia.info/ro/rss/all/',   1),
('Deschide.md',      'https://deschide.md',         'https://deschide.md/rss.xml',         1),
('IPN',              'https://ipn.md',              'https://ipn.md/rss',                  1),
('Moldova1',         'https://moldova1.md',         'https://moldova1.md/rss',             1),
('Point.md',         'https://point.md',            'https://point.md/ro/rss',             1),
('Realitatea.md',    'https://realitatea.md',       'https://realitatea.md/feed/',         1),
('Jurnal.md',        'https://www.jurnal.md',       'https://www.jurnal.md/ro/rss/all',    1),
('Ziarul Național',  'https://www.ziarulnational.md','https://www.ziarulnational.md/feed/',1),
('TVR Moldova',      'https://tvrmoldova.md',       'https://tvrmoldova.md/rss/all',       1),
('Observatorul',     'https://observatorul.md',     'https://observatorul.md/feed/',       1),
('Tribuna.md',       'https://tribuna.md',          'https://tribuna.md/feed/',            1),
-- nisa / regionale
('Anticorupție.md',  'https://anticoruptie.md',     'https://anticoruptie.md/ro/feed',     1),
('Radio Chișinău',   'https://radiochisinau.md',    'https://radiochisinau.md/feed/',      1),
('Zugo.md',          'https://zugo.md',             'https://zugo.md/feed/',               1),
('Kapital.md',       'https://kapital.md',          'https://kapital.md/feed/',            1),
('Nord News',        'https://nordnews.md',         'https://nordnews.md/feed/',           1),
-- fara feed RSS public gasit (dezactivata)
('Agora',            'https://agora.md',            'https://agora.md/rss',                0);
