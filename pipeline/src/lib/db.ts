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

// Inregistreaza rezultatul ultimei verificari a feed-ului, ca sa fie vizibil in /admin.
export async function setSourceStatus(
  db: D1Database, id: number, status: string, ok: boolean
): Promise<void> {
  await db.prepare(
    `UPDATE sources
     SET last_check_at = datetime('now'),
         last_status = ?,
         last_ok_at = CASE WHEN ? = 1 THEN datetime('now') ELSE last_ok_at END
     WHERE id = ?`
  ).bind(status, ok ? 1 : 0, id).run();
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

// --- Reunificarea clusterelor create simultan (vezi migratia 0004) ---

// Pastram mereu clusterul mai vechi (id mai mic), ca doua joburi concurente sa nu
// incerce sa se absoarba reciproc.
export function alegePastrat(a: number, b: number): { pastrat: number; absorbit: number } {
  return a <= b ? { pastrat: a, absorbit: b } : { pastrat: b, absorbit: a };
}

export async function clusterVectorIds(db: D1Database, clusterId: number): Promise<string[]> {
  const { results } = await db.prepare(
    "SELECT vector_id FROM articles WHERE cluster_id = ? AND vector_id IS NOT NULL"
  ).bind(clusterId).all<{ vector_id: string }>();
  return results.map((r) => r.vector_id);
}

// Muta articolele in clusterul pastrat si sterge clusterul golit, intr-o singura
// tranzactie. Reseteaza si marcajul de verificare al celui pastrat: dupa ce a crescut,
// merita re-verificat, poate mai absoarbe un frate.
export async function mergeClusters(db: D1Database, absorbit: number, pastrat: number): Promise<void> {
  await db.batch([
    db.prepare("UPDATE articles SET cluster_id = ? WHERE cluster_id = ?").bind(pastrat, absorbit),
    db.prepare("DELETE FROM clusters WHERE id = ?").bind(absorbit),
    db.prepare("UPDATE clusters SET merge_checked_at = NULL WHERE id = ?").bind(pastrat),
  ]);
}

export async function markMergeChecked(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE clusters SET merge_checked_at = datetime('now') WHERE id = ?").bind(id).run();
}

// Clustere care nu au fost inca re-verificate; le lasam sa "se aseze" cateva minute,
// ca indexul Vectorize sa fie la zi.
export async function clustersNeedingMergeCheck(db: D1Database, limit = 60): Promise<number[]> {
  const { results } = await db.prepare(
    `SELECT id FROM clusters
     WHERE merge_checked_at IS NULL AND first_seen_at <= datetime('now', '-2 minutes')
     ORDER BY id LIMIT ?`
  ).bind(limit).all<{ id: number }>();
  return results.map((r) => r.id);
}

export async function updateClusterSummary(
  db: D1Database, id: number, s: { title: string; category: string; summary: string; count: number; score: number }
) {
  await db.prepare(
    `UPDATE clusters SET canonical_title = ?, category = ?, summary_md = ?,
     source_count = ?, importance_score = ?, last_updated_at = datetime('now') WHERE id = ?`
  ).bind(s.title, s.category, s.summary, s.count, s.score, id).run();
}
