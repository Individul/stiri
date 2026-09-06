export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  QUEUE: Queue<Job>;
  AI: Ai;
}

export type Job =
  | { type: "fetch"; articleId: number }
  | { type: "embed"; articleId: number }
  | { type: "cluster"; articleId: number; values?: number[] }
  | { type: "summarize"; clusterId: number }
  | { type: "merge"; clusterId: number };

export interface Source {
  id: number;
  name: string;
  site_url: string;
  feed_url: string;
  enabled: number;
}

export interface FeedItem {
  url: string;
  title: string;
  author: string | null;
  publishedAt: string | null;
  excerpt: string | null;
}
