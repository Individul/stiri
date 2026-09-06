import { MODELS, type AiLike } from "./ai";

export interface ArticleLite { title: string; excerpt: string; }

// Workers AI (format OpenAI) poate intoarce raspunsul ca:
//  - res.response string,
//  - res.response obiect deja parsat (cand modelul produce JSON),
//  - res.choices[0].message.content string.
// Intoarce partea de text bruta (string), sau null daca e obiect parsat.
function aiText(res: any): string | null {
  const r = res?.response;
  if (typeof r === "string") return r;
  const c = res?.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  return null;
}

// Incearca sa obtina obiectul JSON al rezumatului din oricare forma de raspuns.
function aiJson(res: any): any | null {
  const r = res?.response;
  if (r && typeof r === "object") return r; // deja parsat de Workers AI
  const txt = aiText(res);
  if (!txt) return null;
  const start = txt.indexOf("{"), end = txt.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(txt.slice(start, end + 1)); } catch { return null; }
}

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
  return /^DA\b/.test((aiText(res) ?? "").trim().toUpperCase());
}

export interface ClusterMember { source: string; title: string; text: string; }
export interface Summary { title: string; category: string; summary: string; }

const CATEGORIES = ["Politică", "Economie", "Social", "Justiție", "Externe", "Sport", "Cultură", "Altele"];

// Modelul mare costa ~12x mai mult per rezumat, asa ca il folosim doar la stirile
// relatate de multe redactii, unde sinteza chiar e complexa. Pragul se uita la
// SURSE DISTINCTE, nu la numarul de articole (o redactie poate publica mai multe).
export const PRAG_MODEL_MARE = 10;

export async function summarizeCluster(members: ClusterMember[], ai: AiLike): Promise<Summary> {
  const surseDistincte = new Set(members.map((m) => m.source)).size;
  const model = surseDistincte >= PRAG_MODEL_MARE ? MODELS.large : MODELS.small;
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
  const parsed = aiJson(res) as Summary | null;
  if (!parsed) throw new Error("summarize: fara JSON in raspuns");
  if (!parsed.title?.trim() || !parsed.summary?.trim()) {
    throw new Error("summarize: title/summary lipsa");
  }
  if (!CATEGORIES.includes(parsed.category)) parsed.category = "Altele";
  return parsed;
}
