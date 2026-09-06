export interface ClusterCard {
  id: number;
  canonical_title: string;
  category: string;
  source_count: number;
  last_updated_at: string;
  lead: string;
}

export async function topClusters(
  db: D1Database, category?: string, q?: string
): Promise<ClusterCard[]> {
  const clauses = ["summary_md IS NOT NULL", "canonical_title IS NOT NULL"];
  const binds: unknown[] = [];
  if (category) { clauses.push("category = ?"); binds.push(category); }
  if (q) {
    clauses.push("(canonical_title LIKE ? OR summary_md LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  const { results } = await db.prepare(
    `SELECT id, canonical_title, category, source_count, last_updated_at,
            substr(summary_md, 1, 240) AS lead
     FROM clusters
     WHERE ${clauses.join(" AND ")}
     ORDER BY last_updated_at DESC
     LIMIT 200`
  ).bind(...binds).all<ClusterCard>();
  return results;
}

// --- Administrarea surselor (pagina /admin, protejata cu Cloudflare Access) ---

export interface SourceRow {
  id: number; name: string; site_url: string; feed_url: string;
  enabled: number; created_at: string; articole: number;
}

export async function listSources(db: D1Database): Promise<SourceRow[]> {
  const { results } = await db.prepare(
    `SELECT s.id, s.name, s.site_url, s.feed_url, s.enabled, s.created_at,
            (SELECT COUNT(*) FROM articles a WHERE a.source_id = s.id) AS articole
     FROM sources s
     ORDER BY s.enabled DESC, s.name`
  ).all<SourceRow>();
  return results;
}

export async function addSource(
  db: D1Database, s: { name: string; site_url: string; feed_url: string }
): Promise<void> {
  await db.prepare(
    "INSERT OR IGNORE INTO sources (name, site_url, feed_url, enabled) VALUES (?, ?, ?, 1)"
  ).bind(s.name, s.site_url, s.feed_url).run();
}

export async function setSourceEnabled(db: D1Database, id: number, enabled: boolean): Promise<void> {
  await db.prepare("UPDATE sources SET enabled = ? WHERE id = ?").bind(enabled ? 1 : 0, id).run();
}

export interface PopularItem {
  id: number;
  canonical_title: string;
  source_count: number;
  last_updated_at: string;
}

// Cele mai populare = cele mai multe surse distincte, intr-o fereastra de timp.
// `interval` e un modificator SQLite, ex. '-48 hours', '-7 days', '-30 days'.
export async function popularClusters(
  db: D1Database, interval: string, limit = 7
): Promise<PopularItem[]> {
  const { results } = await db.prepare(
    `SELECT id, canonical_title, source_count, last_updated_at
     FROM clusters
     WHERE summary_md IS NOT NULL AND canonical_title IS NOT NULL
       AND source_count > 0
       AND last_updated_at >= datetime('now', ?)
     ORDER BY source_count DESC, last_updated_at DESC
     LIMIT ?`
  ).bind(interval, limit).all<PopularItem>();
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
  // O singura intrare per sursa: cel mai recent articol al acelei surse din grup.
  // (O redactie poate republica acelasi articol cu titlu/slug editat.)
  const { results } = await db.prepare(
    `SELECT s.name AS source, a.title AS title, a.url AS url, a.published_at AS published_at
     FROM articles a
     JOIN sources s ON s.id = a.source_id
     WHERE a.cluster_id = ?
       AND a.id = (
         SELECT a2.id FROM articles a2
         WHERE a2.cluster_id = a.cluster_id AND a2.source_id = a.source_id
         ORDER BY COALESCE(a2.published_at, '') DESC, a2.id DESC
         LIMIT 1
       )
     ORDER BY a.published_at`
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
