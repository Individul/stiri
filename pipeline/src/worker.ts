import type { Env, Job } from "./types";
import { parseFeed } from "./lib/rss";
import { extractText } from "./lib/extract";
import { embed } from "./lib/embeddings";
import { confirmSameEvent, summarizeCluster } from "./lib/summarize";
import { decideCluster } from "./lib/cluster";
import { normalizeUrl, titlesNearlyIdentical } from "./lib/urls";
import { Meter } from "./lib/meter";
import * as db from "./lib/db";

export default {
  async fetch(_req: Request, _env: Env): Promise<Response> {
    // Pipeline-ul ruleaza pe cron (*/10) + cozi; nu are pagina web. Mesaj de stare
    // ca sa nu apara eroarea 1101 la un GET.
    return new Response("stiri-pipeline: ruleaza pe cron (*/10). Fara pagina web.\n", { status: 200 });
  },
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(discover(env));
  },
  async queue(batch: MessageBatch<Job>, env: Env) {
    for (const msg of batch.messages) {
      try {
        await handleJob(msg.body, env);
        msg.ack();
      } catch (e) {
        console.error("job failed", msg.body, e);
        msg.retry();
      }
    }
  },
};

export async function discover(env: Env) {
  const sources = await db.enabledSources(env.DB);
  for (const src of sources) {
    try {
      const res = await fetch(src.feed_url, { headers: { "user-agent": "StiriMD/1.0" } });
      if (!res.ok) continue;
      const items = parseFeed(await res.text());
      // Titluri recente ale sursei: prind acelasi articol republicat cu titlu editat.
      const titluriRecente = await db.recentTitlesOfSource(env.DB, src.id);
      for (const item of items) {
        const url = normalizeUrl(item.url);
        if (await db.articleExists(env.DB, url)) continue;
        if (titluriRecente.some((t) => titlesNearlyIdentical(t, item.title))) continue;
        const id = await db.insertArticle(env.DB, {
          sourceId: src.id, url, title: item.title,
          author: item.author, publishedAt: item.publishedAt, excerpt: item.excerpt,
        });
        titluriRecente.push(item.title);
        await env.QUEUE.send({ type: "fetch", articleId: id });
      }
    } catch (e) {
      console.error("source failed", src.feed_url, e);
    }
  }
}

export async function handleJob(job: Job, env: Env) {
  switch (job.type) {
    case "fetch": return doFetch(job.articleId, env);
    case "embed": return doEmbed(job.articleId, env);
    case "cluster": return doCluster(job.articleId, env, job.values);
    case "summarize": return doSummarize(job.clusterId, env);
  }
}

export async function doFetch(articleId: number, env: Env) {
  const row = await env.DB.prepare(
    "SELECT url, excerpt FROM articles WHERE id = ?"
  ).bind(articleId).first<{ url: string; excerpt: string | null }>();
  if (!row) return;
  let text = row.excerpt ?? "";
  try {
    const res = await fetch(row.url, { headers: { "user-agent": "StiriMD/1.0" } });
    if (res.ok) {
      const extracted = extractText(await res.text());
      if (extracted.length > text.length) text = extracted;
    }
  } catch (e) { console.error("fetch article failed", row.url, e); }
  if (!text.trim()) {
    // Nici pagina, nici excerptul RSS n-au dat text — marcam eroare si oprim lantul.
    await db.setStatus(env.DB, articleId, "error");
    return;
  }
  await db.setExtracted(env.DB, articleId, text);
  await env.QUEUE.send({ type: "embed", articleId });
}

export async function doEmbed(articleId: number, env: Env) {
  const row = await env.DB.prepare(
    "SELECT title, published_at, COALESCE(extracted_text, excerpt, '') AS text FROM articles WHERE id = ?"
  ).bind(articleId).first<{ title: string; published_at: string | null; text: string }>();
  if (!row) return;
  const meter = new Meter();
  const vector = await embed(`${row.title}\n${row.text.slice(0, 2000)}`, meter.wrap("embed", env.AI));
  await meter.flush(env.DB);
  const vectorId = `a${articleId}`;
  // publishedAt = timpul de publicare al articolului (epoch ms), pentru viitoarea fereastra de dedup pe 48h.
  const publishedAt = row.published_at ? Date.parse(row.published_at) : Date.now();
  await env.VECTORIZE.upsert([{ id: vectorId, values: vector,
    metadata: { articleId, publishedAt: isNaN(publishedAt) ? Date.now() : publishedAt } }]);
  await db.setVector(env.DB, articleId, vectorId);
  // Trecem vectorul mai departe: Vectorize e eventual-consistent, deci getByIds imediat dupa
  // upsert poate intoarce gol. Cu vectorul in mesaj, doCluster nu depinde de indexare.
  await env.QUEUE.send({ type: "cluster", articleId, values: vector });
}

export async function doCluster(articleId: number, env: Env, values?: number[]) {
  const row = await env.DB.prepare(
    `SELECT a.title, COALESCE(a.extracted_text, a.excerpt, '') AS text, a.vector_id
     FROM articles a WHERE a.id = ?`
  ).bind(articleId).first<{ title: string; text: string; vector_id: string }>();
  if (!row?.vector_id) return;
  // Fallback pentru joburi vechi fara vector in mesaj: citim din index; daca nu e inca
  // indexat, aruncam ca sa reincercam (nu iesim tacut, altfel articolul ramane blocat).
  if (!values) {
    const self = await env.VECTORIZE.getByIds([row.vector_id]);
    const stored = self[0]?.values;
    if (!stored) throw new Error(`vector ${row.vector_id} inca neindexat; reincercam`);
    values = Array.from(stored as ArrayLike<number>);
  }

  const matches = await env.VECTORIZE.query(values, { topK: 5, returnMetadata: true });
  const candidate = matches.matches.find((m) => m.id !== row.vector_id) ?? null;
  const decision = decideCluster(candidate ? candidate.score : null);

  let clusterId: number | null = null;
  if (decision === "attach" && candidate) {
    clusterId = await clusterIdOfVector(env, candidate.id);
  } else if (decision === "confirm" && candidate) {
    const other = await articleByVector(env, candidate.id);
    const meter = new Meter();
    const same = other && await confirmSameEvent(
      { title: row.title, excerpt: row.text.slice(0, 600) },
      { title: other.title, excerpt: other.text.slice(0, 600) },
      meter.wrap("confirm", env.AI)
    );
    await meter.flush(env.DB);
    if (same) clusterId = await clusterIdOfVector(env, candidate.id);
  }
  if (clusterId === null) clusterId = await db.createCluster(env.DB);
  await db.attachToCluster(env.DB, articleId, clusterId);
  await env.QUEUE.send({ type: "summarize", clusterId });
}

async function clusterIdOfVector(env: Env, vectorId: string): Promise<number | null> {
  const row = await env.DB.prepare(
    "SELECT cluster_id FROM articles WHERE vector_id = ?"
  ).bind(vectorId).first<{ cluster_id: number | null }>();
  return row?.cluster_id ?? null;
}

async function articleByVector(env: Env, vectorId: string) {
  return env.DB.prepare(
    "SELECT title, COALESCE(extracted_text, excerpt, '') AS text FROM articles WHERE vector_id = ?"
  ).bind(vectorId).first<{ title: string; text: string }>();
}

export async function doSummarize(clusterId: number, env: Env) {
  const members = await db.clusterMembers(env.DB, clusterId);
  if (members.length === 0) return;
  // Numar de SURSE distincte (nu de articole) — asta afiseaza „N surse" in UI.
  const sourceCount = new Set(members.map((m) => m.source)).size;

  // Rescriem rezumatul cu AI doar cand apare o SURSA noua (sau daca nu exista inca
  // rezumat). Un al doilea articol de la aceeasi sursa nu declanseaza un apel AI.
  const stare = await db.clusterSummaryState(env.DB, clusterId);
  if (stare?.hasSummary && stare.sourceCount === sourceCount) return;

  const meter = new Meter();
  const summary = await summarizeCluster(members, meter.wrap("summarize", env.AI));
  await meter.flush(env.DB);
  // Scorul stocat e semnalul durabil (nr. surse); decaderea pe recenta se aplica la
  // citire, in site, folosind last_updated_at (vezi Faza 6). Stocam nr. surselor ca scor.
  await db.updateClusterSummary(env.DB, clusterId, {
    title: summary.title, category: summary.category, summary: summary.summary,
    count: sourceCount, score: sourceCount,
  });
}
