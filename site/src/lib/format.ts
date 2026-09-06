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

export function relTime(iso: string | null, now: Date = new Date()): string {
  const d = parseDbDate(iso);
  if (!d) return "";
  const min = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (min < 1) return "acum câteva secunde";
  if (min < 60) return `acum ${min} ${min === 1 ? "minut" : "minute"}`;
  const h = Math.round(min / 60);
  if (h < 24) return `acum ${h} ${h === 1 ? "oră" : "ore"}`;
  const zile = Math.round(h / 24);
  return `acum ${zile} ${zile === 1 ? "zi" : "zile"}`;
}
