import { MODELS, type AiLike } from "./ai";

export interface ArticleLite { title: string; excerpt: string; }

export async function confirmSameEvent(
  a: ArticleLite, b: ArticleLite, ai: AiLike
): Promise<boolean> {
  const prompt =
    `Două articole din presa din R. Moldova. Relatează EXACT același eveniment concret ` +
    `(nu doar aceeași temă generală)? Răspunde doar cu DA sau NU.\n\n` +
    `Articol 1: ${a.title}\n${a.excerpt}\n\nArticol 2: ${b.title}\n${b.excerpt}`;
  const res = await ai.run(MODELS.small, {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 5,
    temperature: 0,
  });
  return /^DA\b/.test(String(res?.response ?? "").trim().toUpperCase());
}

export interface ClusterMember { source: string; title: string; text: string; }
export interface Summary { title: string; category: string; summary: string; }

const CATEGORIES = ["Politică", "Economie", "Social", "Justiție", "Externe", "Sport", "Cultură", "Altele"];

export async function summarizeCluster(members: ClusterMember[], ai: AiLike): Promise<Summary> {
  const model = members.length >= 2 ? MODELS.large : MODELS.small;
  const sources = members
    .map((m, i) => `[Sursa ${i + 1} — ${m.source}] ${m.title}\n${m.text.slice(0, 4000)}`)
    .join("\n\n---\n\n");
  const prompt =
    `Ești redactor. Pe baza articolelor de mai jos, care relatează același eveniment, ` +
    `scrie un rezumat neutru în limba română, de 2-4 paragrafe, care combină informația ` +
    `din toate sursele fără a copia fraze întregi. Alege un titlu canonic clar și o ` +
    `categorie din: ${CATEGORIES.join(", ")}.\n\n` +
    `Răspunde DOAR cu JSON valid: {"title": "...", "category": "...", "summary": "..."}\n\n` +
    `Articole:\n\n${sources}`;
  const res = await ai.run(model, {
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.2,
  });
  const raw = String(res?.response ?? "");
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("summarize: fara JSON in raspuns");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Summary;
  if (!parsed.title?.trim() || !parsed.summary?.trim()) {
    throw new Error("summarize: title/summary lipsa");
  }
  if (!CATEGORIES.includes(parsed.category)) parsed.category = "Altele";
  return parsed;
}
