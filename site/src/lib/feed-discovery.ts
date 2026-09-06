// Descoperirea automata a feed-ului RSS/Atom pornind doar de la adresa site-ului.
// Doua metode, in ordine: link-ul de autodescoperire din pagina, apoi cai uzuale.

// Cai incercate daca pagina nu declara niciun feed.
const CAI_UZUALE = [
  "/feed/", "/feed", "/rss", "/rss.xml", "/ro/feed/", "/ro/rss",
  "/rss/all", "/ro/rss/all/", "/index.xml", "/atom.xml", "/?feed=rss2",
];

// Feed-urile de comentarii (WordPress expune /comments/feed/) nu sunt stiri.
function eFeedDeComentarii(u: string): boolean {
  return /\/comments?\//i.test(u) || /comment/i.test(new URL(u, "https://x").search);
}

// <link rel="alternate" type="application/rss+xml" href="..."> din pagina.
export function extrageLinkuriFeed(html: string, baseUrl: string): string[] {
  const linkuri: string[] = [];
  const taguri = html.match(/<link[^>]+>/gi) ?? [];
  for (const tag of taguri) {
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue;
    if (!/application\/(rss|atom)\+xml/i.test(tag)) continue;
    const m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!m) continue;
    try { linkuri.push(new URL(m[1], baseUrl).toString()); } catch { /* href invalid */ }
  }
  return linkuri;
}

// Numele site-ului, ca sa nu fie nevoie sa-l scrie utilizatorul.
export function numeSite(html: string): string | null {
  const og = html.match(/<meta[^>]+property\s*=\s*["']og:site_name["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (og) return og[1].trim();
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!t) return null;
  // „Nume — descriere lunga” => pastram doar prima parte.
  return t[1].replace(/\s+/g, " ").trim().split(/\s+[|–—-]\s+/)[0].slice(0, 60) || null;
}

// Ordinea de incercare: feed-uri declarate (cele in romana intai), apoi cai uzuale.
export function candidati(siteUrl: string, dinPagina: string[]): string[] {
  const declarate = dinPagina.filter((u) => !eFeedDeComentarii(u));
  const ro = declarate.filter((u) => /\/ro(\/|$)/i.test(u));
  const restul = declarate.filter((u) => !ro.includes(u));

  const uzuale: string[] = [];
  for (const cale of CAI_UZUALE) {
    try { uzuale.push(new URL(cale, siteUrl).toString()); } catch { /* ignoram */ }
  }
  return [...new Set([...ro, ...restul, ...uzuale])];
}

export function numaraArticole(xml: string): number {
  return (xml.match(/<item[\s>]|<entry[\s>]/gi) ?? []).length;
}

export type Descoperire =
  | { ok: true; feedUrl: string; articole: number; nume: string | null }
  | { ok: false; incercate: string[] };

export async function descoperaFeed(
  siteUrl: string, fetchFn: typeof fetch = fetch, maxIncercari = 9
): Promise<Descoperire> {
  const antet = { "user-agent": "StiriMD/1.0" };
  let html = "";
  let nume: string | null = null;
  try {
    const res = await fetchFn(siteUrl, { headers: antet });
    if (res.ok) {
      html = await res.text();
      nume = numeSite(html);
    }
  } catch { /* mergem mai departe cu caile uzuale */ }

  const lista = candidati(siteUrl, extrageLinkuriFeed(html, siteUrl)).slice(0, maxIncercari);
  const incercate: string[] = [];

  for (const url of lista) {
    incercate.push(url);
    try {
      const res = await fetchFn(url, { headers: antet });
      if (!res.ok) continue;
      const n = numaraArticole(await res.text());
      if (n > 0) return { ok: true, feedUrl: url, articole: n, nume };
    } catch { /* incercam urmatorul */ }
  }
  return { ok: false, incercate };
}
