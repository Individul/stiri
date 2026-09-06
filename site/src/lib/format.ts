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
