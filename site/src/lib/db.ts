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

// --- Urmarirea cheltuielilor Workers AI ---
// Cost Cloudflare: $0.011 / 1000 Neuroni. Primii 10.000 Neuroni/zi sunt gratis.
export const USD_PER_NEURON = 0.011 / 1000;
export const FREE_NEURONS_PER_DAY = 10000;

export interface UsageRow { step: string; model: string; neurons: number; calls: number; }
export interface DayUsage { day: string; neurons: number; calls: number; }

export async function usageBreakdown(db: D1Database, day: string): Promise<UsageRow[]> {
  const { results } = await db.prepare(
    `SELECT step, model, SUM(neurons) AS neurons, SUM(calls) AS calls
     FROM usage WHERE day = ? GROUP BY step, model ORDER BY neurons DESC`
  ).bind(day).all<UsageRow>();
  return results;
}

export async function usageSince(db: D1Database, sinceDay: string): Promise<DayUsage[]> {
  const { results } = await db.prepare(
    `SELECT day, SUM(neurons) AS neurons, SUM(calls) AS calls
     FROM usage WHERE day >= ? GROUP BY day ORDER BY day DESC`
  ).bind(sinceDay).all<DayUsage>();
  return results;
}

export async function usageTotalSince(db: D1Database, sinceDay: string): Promise<{ neurons: number; calls: number }> {
  const row = await db.prepare(
    "SELECT COALESCE(SUM(neurons),0) AS neurons, COALESCE(SUM(calls),0) AS calls FROM usage WHERE day >= ?"
  ).bind(sinceDay).first<{ neurons: number; calls: number }>();
  return row ?? { neurons: 0, calls: 0 };
}
