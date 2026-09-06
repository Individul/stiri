export interface ClusterCard {
  id: number;
  canonical_title: string;
  category: string;
  source_count: number;
  last_updated_at: string;
  lead: string;
}

export async function topClusters(db: D1Database, category?: string): Promise<ClusterCard[]> {
  const where = category ? "AND category = ?" : "";
  const stmt = db.prepare(
    `SELECT id, canonical_title, category, source_count, last_updated_at,
            substr(summary_md, 1, 240) AS lead
     FROM clusters
     WHERE summary_md IS NOT NULL AND canonical_title IS NOT NULL ${where}
     ORDER BY last_updated_at DESC
     LIMIT 200`
  );
  const bound = category ? stmt.bind(category) : stmt;
  const { results } = await bound.all<ClusterCard>();
  return results;
}

export async function distinctCategories(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare(
    "SELECT DISTINCT category FROM clusters WHERE category IS NOT NULL AND summary_md IS NOT NULL ORDER BY category"
  ).all<{ category: string }>();
  return results.map((r) => r.category);
}

export interface ClusterDetail {
  id: number;
  canonical_title: string;
  category: string;
  summary_md: string;
  source_count: number;
  last_updated_at: string;
}

export async function clusterById(db: D1Database, id: number): Promise<ClusterDetail | null> {
  return db.prepare(
    "SELECT id, canonical_title, category, summary_md, source_count, last_updated_at FROM clusters WHERE id = ?"
  ).bind(id).first<ClusterDetail>();
}

export interface ClusterSource {
  source: string;
  title: string;
  url: string;
  published_at: string | null;
}

export async function clusterSources(db: D1Database, id: number): Promise<ClusterSource[]> {
  const { results } = await db.prepare(
    `SELECT s.name AS source, a.title AS title, a.url AS url, a.published_at AS published_at
     FROM articles a JOIN sources s ON s.id = a.source_id
     WHERE a.cluster_id = ? ORDER BY a.published_at`
  ).bind(id).all<ClusterSource>();
  return results;
}
