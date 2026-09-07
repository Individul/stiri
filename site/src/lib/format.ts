export function formatSourceCount(n: number): string {
  const de = n >= 20 && (n % 100 === 0 || n % 100 >= 20);
  const noun = n === 1 ? "sursă" : "surse";
  return de ? `${n} de ${noun}` : `${n} ${noun}`;
}

// Scor cu decadere pe recenta, calculat la momentul citirii (rezolva finding-ul de review
// „recency no-op": scorul stocat e doar nr. surselor; decaderea trebuie aplicata la citire).
export function rankScore(sourceCount: number, lastUpdatedIso: string, now: Date = new Date()): number {
  // D1 stocheaza `datetime('now')` ca "YYYY-MM-DD HH:MM:SS" in UTC, fara `T`/`Z`.
  // Normalizam ca sa fie parsat robust ca UTC. Daca vine deja cu `T`/`Z`, il lasam asa.
  const normalized = /[T]/.test(lastUpdatedIso)
    ? lastUpdatedIso
    : lastUpdatedIso.replace(" ", "T") + "Z";
  const ageHours = (now.getTime() - new Date(normalized).getTime()) / 3.6e6;
  const recency = Math.exp(-Math.max(0, ageHours) / 24);
  return sourceCount * recency;
}

// D1 scrie "YYYY-MM-DD HH:MM:SS" in UTC; normalizam inainte de parsare.
export function parseDbDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(/[T]/.test(iso) ? iso : iso.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

// Worker-ul ruleaza in UTC, iar D1 stocheaza tot UTC. Fara fus explicit am afisa
// ore cu 3 ore in urma fata de ora reala din Moldova.
export const FUS = "Europe/Chisinau";

// „duminică, 6 septembrie la 19:04”
export function fmtDataOra(iso: string | null): string {
  const d = parseDbDate(iso);
  if (!d) return "";
  const data = d.toLocaleDateString("ro-RO", {
    timeZone: FUS, weekday: "long", day: "numeric", month: "long",
  });
  const ora = d.toLocaleTimeString("ro-RO", {
    timeZone: FUS, hour: "2-digit", minute: "2-digit",
  });
  return `${data} la ${ora}`;
}

// „6 septembrie 2026”
export function fmtData(iso: string | null): string {
  const d = parseDbDate(iso);
  return d
    ? d.toLocaleDateString("ro-RO", { timeZone: FUS, day: "numeric", month: "long", year: "numeric" })
    : "";
}

export function relTime(iso: string | null, now: Date = new Date()): string {
  const d = parseDbDate(iso);
  if (!d) return "";
  const min = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (min < 1) return "chiar acum";
  if (min < 60) return `acum ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "acum o oră" : `acum ${h} ore`;
  const zile = Math.round(h / 24);
  return zile === 1 ? "acum o zi" : `acum ${zile} zile`;
}

// Adresa canonică a paginii. Site-ul e servit și pe *.workers.dev, iar fără canonical
// Google ar indexa același conținut de două ori și ar împărți semnalele SEO între ele.
// Din query păstrăm doar `cat` (categoriile sunt pagini distincte); căutarea și token-ul
// de admin nu au ce căuta într-o adresă canonică.
export function canonicalUrl(url: URL, site: string | URL): string {
  const c = new URL(url.pathname, site);
  const cat = url.searchParams.get("cat");
  if (cat) c.searchParams.set("cat", cat);
  return c.href;
}

// Pagini care nu trebuie indexate: adminul (are token în adresă) și rezultatele
// de căutare (număr nelimitat de adrese cu conținut aproape identic).
export function nuIndexa(url: URL): boolean {
  return url.pathname.startsWith("/admin") || url.searchParams.has("q");
}
