// Parametri de urmarire care nu schimba articolul; ii scoatem ca sa nu creem duplicate.
const TRACKING = /^(utm_.*|fbclid|gclid|yclid|igshid|mc_cid|mc_eid|ref|_ga)$/i;

// Normalizeaza URL-ul pastrandu-l functional pentru fetch (NU scoatem "www.",
// unele site-uri il cer): fara fragment, fara parametri de urmarire, fara "/" final.
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    const pastrate: [string, string][] = [];
    u.searchParams.forEach((v, k) => { if (!TRACKING.test(k)) pastrate.push([k, v]); });
    u.search = "";
    pastrate.sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => u.searchParams.append(k, v));
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return raw.trim();
  }
}

// Unele site-uri servesc RSS-ul dintr-un cache blocat: observatorul.md returna articole
// vechi de o luna, desi publica zilnic. Antetele no-cache nu ajuta — doar un URL diferit.
// Folosim un parametru care se schimba o data la 10 minute (cat e si ciclul de cron):
// mereu proaspat intre cicluri, dar cacheabil in interiorul unui ciclu.
export function feedUrlAntiCache(feedUrl: string, now: number = Date.now()): string {
  try {
    const u = new URL(feedUrl);
    u.searchParams.set("_", String(Math.floor(now / 600_000)));
    return u.toString();
  } catch {
    return feedUrl;
  }
}

export function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Acelasi articol republicat cu titlu editat (redactiile corecteaza titluri, ceea ce
// schimba si slug-ul din URL). Comparam titlurile normalizate.
export function titlesNearlyIdentical(a: string, b: string): boolean {
  const x = normTitle(a), y = normTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;

  // Unul il contine pe celalalt (ex. „Ne este greu…” vs „Este greu…”).
  const [scurt, lung] = x.length <= y.length ? [x, y] : [y, x];
  if (scurt.length >= 20 && lung.includes(scurt)) return true;

  // Suprapunere foarte mare de cuvinte.
  const A = new Set(scurt.split(" "));
  const B = new Set(lung.split(" "));
  let comune = 0;
  A.forEach((w) => { if (B.has(w)) comune++; });
  const reuniune = new Set([...A, ...B]).size;
  return reuniune > 0 && comune / reuniune >= 0.85;
}
