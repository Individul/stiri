import { describe, it, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
// DDL-ul migratiilor, importat ca text brut (Vite/vitest, sufixul ?raw).
import migration1 from "../migrations/0001_init.sql?raw";
import migration2 from "../migrations/0002_usage.sql?raw";
import migration3 from "../migrations/0003_source_health.sql?raw";
import migration4 from "../migrations/0004_merge_check.sql?raw";
import { doEmbed, doCluster } from "../src/worker";
import { MODELS } from "../src/lib/ai";
import type { Env } from "../src/types";

// `env` din cloudflare:test e tipat ca ProvidedEnv (gol). In pool avem D1-ul real
// pe binding-ul DB; il tipam prin Env-ul nostru pentru accesul din teste.
const DB = (env as unknown as Env).DB;

// Vector determinist pe baza unui cuvant-cheie: duplicatele impart acelasi cuvant
// => vector identic => cosine 1.0 => calea "attach". Stirea distincta e ortogonala.
function vectorFor(text: string): number[] {
  const t = text.toLowerCase();
  if (t.includes("alegeri")) return [1, 0, 0];
  if (t.includes("meci")) return [0, 1, 0];
  return [0, 0, 1];
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Fake Vectorize: un Map in memorie cu cosine similarity real.
function makeFakeVectorize() {
  const store = new Map<string, number[]>();
  return {
    async upsert(list: { id: string; values: number[] }[]) {
      for (const v of list) store.set(v.id, v.values);
      return { mutationId: "m" };
    },
    async getByIds(ids: string[]) {
      return ids
        .filter((id) => store.has(id))
        .map((id) => ({ id, values: store.get(id)! }));
    },
    async query(values: number[], opts: { topK: number }) {
      const matches = [...store.entries()]
        .map(([id, vals]) => ({ id, score: cosine(values, vals) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, opts.topK);
      return { matches };
    },
  };
}

// Fake Workers AI: embed determinist, confirm=DA, summarize=JSON valid.
const fakeAi = {
  async run(model: string, input: any) {
    if (model === MODELS.embed) {
      return { data: [vectorFor(input.text[0])] };
    }
    if (input?.max_tokens <= 5) {
      return { response: "DA" };
    }
    return { response: JSON.stringify({ title: "T", category: "Social", summary: "S" }) };
  },
};

const fakeQueue = { send: async () => {} };

const testEnv: any = {
  ...env,
  AI: fakeAi,
  VECTORIZE: makeFakeVectorize(),
  QUEUE: fakeQueue,
};

async function insertArticle(url: string, title: string, text: string): Promise<number> {
  const res = await DB.prepare(
    `INSERT INTO articles (source_id, url, title, excerpt, extracted_text, status)
     VALUES (1, ?, ?, ?, ?, 'fetched')`
  ).bind(url, title, text, text).run();
  return res.meta.last_row_id as number;
}

async function clusterOf(id: number): Promise<number | null> {
  const row = await DB.prepare(
    "SELECT cluster_id FROM articles WHERE id = ?"
  ).bind(id).first<{ cluster_id: number | null }>();
  return row?.cluster_id ?? null;
}

beforeAll(async () => {
  for (const stmt of (migration1 + ";" + migration2 + ";" + migration3 + ";" + migration4).split(";")) {
    const s = stmt.trim();
    if (s) await DB.prepare(s).run();
  }
  await DB.prepare(
    "INSERT INTO sources (name, site_url, feed_url) VALUES ('Test','https://t.md','https://t.md/rss')"
  ).run();
});

describe("pipeline dedup wiring (D1 real + AI/Vectorize/Queue mock)", () => {
  it("grupeaza duplicatele si separa stirea distincta", async () => {
    const dup1 = await insertArticle(
      "https://t.md/alegeri-1", "Alegeri prezidentiale, turul doi",
      "Rezultatele alegeri prezidentiale au fost anuntate azi."
    );
    const dup2 = await insertArticle(
      "https://t.md/alegeri-2", "Turul doi al alegerilor prezidentiale",
      "Astazi s-au anuntat rezultatele la alegeri prezidentiale."
    );
    const distinct = await insertArticle(
      "https://t.md/meci-1", "Meci decisiv in campionat",
      "Un meci important s-a jucat aseara pe stadion."
    );

    // Secvential: al doilea duplicat trebuie sa vada primul in indexul fake.
    for (const id of [dup1, dup2, distinct]) {
      await doEmbed(id, testEnv);
      await doCluster(id, testEnv);
    }

    const c1 = await clusterOf(dup1);
    const c2 = await clusterOf(dup2);
    const cD = await clusterOf(distinct);

    expect(c1).not.toBeNull();
    expect(c2).not.toBeNull();
    expect(cD).not.toBeNull();

    // Duplicatele impart acelasi cluster; stirea distincta e in alt cluster.
    expect(c2).toBe(c1);
    expect(cD).not.toBe(c1);
  });
});
