export function importanceScore(
  sourceCount: number,
  lastUpdatedIso: string,
  now: Date = new Date()
): number {
  const ageHours = (now.getTime() - new Date(lastUpdatedIso).getTime()) / 3.6e6;
  const recency = Math.exp(-ageHours / 24); // decadere ~o zi
  return sourceCount * recency;
}

export function formatSourceCount(n: number): string {
  const de = n >= 20 && (n % 100 === 0 || n % 100 >= 20);
  const noun = n === 1 ? "sursă" : "surse";
  return de ? `${n} de ${noun}` : `${n} ${noun}`;
}
