import type { Source } from "../types";

export async function enabledSources(db: D1Database): Promise<Source[]> {
  const { results } = await db.prepare(
    "SELECT id, name, site_url, feed_url, enabled FROM sources WHERE enabled = 1"
  ).all<Source>();
  return results;
}

export async function articleExists(db: D1Database, url: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 FROM articles WHERE url = ?").bind(url).first();
  return row !== null;
}

// Titlurile recente ale unei surse — ca sa prindem acelasi articol republicat cu
// titlu editat (slug schimbat => URL diferit, dar e acelasi articol).
export async function recentTitlesOfSource(
  db: D1Database, sourceId: number, limit = 200
): Promise<string[]> {
  const { results } = await db.prepare(
    `SELECT title FROM articles
     WHERE source_id = ? AND created_at >= datetime('now', '-2 days')
     ORDER BY id DESC LIMIT ?`
  ).bind(sourceId, limit).all<{ title: string }>();
  return results.map((r) => r.title);
}

export async function insertArticle(
  db: D1Database, a: { sourceId: number; url: string; title: string; author: string | null;
    publishedAt: string | null; excerpt: string | null; }
): Promise<number> {
  const res = await db.prepare(
    `INSERT INTO articles (source_id, url, title, author, published_at, excerpt, status)
     VALUES (?, ?, ?, ?, ?, ?, 'new')`
  ).bind(a.sourceId, a.url, a.title, a.author, a.publishedAt, a.excerpt).run();
  return res.meta.last_row_id as number;
}

export async function setExtracted(db: D1Database, id: number, text: string) {
  await db.prepare(
    "UPDATE articles SET extracted_text = ?, status = 'fetched', fetched_at = datetime('now') WHERE id = ?"
  ).bind(text, id).run();
}

export async function setVector(db: D1Database, id: number, vectorId: string) {
  await db.prepare(
    "UPDATE articles SET vector_id = ?, status = 'embedded' WHERE id = ?"
  ).bind(vectorId, id).run();
}

export async function setStatus(db: D1Database, id: number, status: string) {
  await db.prepare("UPDATE articles SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function createCluster(db: D1Database): Promise<number> {
  const res = await db.prepare(
    "INSERT INTO clusters DEFAULT VALUES"
  ).run();
  return res.meta.last_row_id as number;
}

export async function attachToCluster(db: D1Database, articleId: number, clusterId: number) {
  await db.prepare(
    "UPDATE articles SET cluster_id = ?, status = 'clustered' WHERE id = ?"
  ).bind(clusterId, articleId).run();
}

export async function clusterMembers(db: D1Database, clusterId: number) {
  const { results } = await db.prepare(
    `SELECT s.name AS source, a.title AS title, COALESCE(a.extracted_text, a.excerpt, '') AS text
     FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.cluster_id = ?`
  ).bind(clusterId).all<{ source: string; title: string; text: string }>();
  return results;
}

// Starea rezumatului: exista deja un rezumat si cate surse distincte avea la scrierea lui.
// Folosita ca sa rescriem cu AI doar cand apare o sursa noua.
export async function clusterSummaryState(
  db: D1Database, id: number
): Promise<{ hasSummary: boolean; sourceCount: number } | null> {
  const row = await db.prepare(
    "SELECT (summary_md IS NOT NULL) AS has_summary, source_count FROM clusters WHERE id = ?"
  ).bind(id).first<{ has_summary: number; source_count: number }>();
  if (!row) return null;
  return { hasSummary: row.has_summary === 1, sourceCount: row.source_count };
}

export async function updateClusterSummary(
  db: D1Database, id: number, s: { title: string; category: string; summary: string; count: number; score: number }
) {
  await db.prepare(
    `UPDATE clusters SET canonical_title = ?, category = ?, summary_md = ?,
     source_count = ?, importance_score = ?, last_updated_at = datetime('now') WHERE id = ?`
  ).bind(s.title, s.category, s.summary, s.count, s.score, id).run();
}
