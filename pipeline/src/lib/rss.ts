import type { FeedItem } from "../types";

function block(tag: string, xml: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) ?? [];
}

function tag(name: string, xml: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return decode(stripCdata(m[1])).trim() || null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function toIso(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function atomLink(xml: string): string | null {
  const links = xml.match(/<link[^>]*href="[^"]+"[^>]*\/?>/gi) ?? [];
  const href = (link: string): string | null => {
    const m = link.match(/href="([^"]+)"/i);
    return m ? m[1] : null;
  };
  const rel = (link: string): string | null => {
    const m = link.match(/rel="([^"]+)"/i);
    return m ? m[1].toLowerCase() : null;
  };
  const preferred = links.find((l) => {
    const r = rel(l);
    return r === "alternate" || r === null;
  });
  return href(preferred ?? links[0] ?? "") ;
}

export function parseFeed(xml: string): FeedItem[] {
  const items = block("item", xml);
  const entries = items.length ? items : block("entry", xml);
  return entries
    .map((raw) => {
      const url = tag("link", raw) ?? atomLink(raw);
      const title = tag("title", raw);
      if (!url || !title) return null;
      const desc = tag("description", raw) ?? tag("summary", raw);
      const rawAuthor = tag("author", raw) ?? tag("dc:creator", raw);
      return {
        url,
        title,
        author: rawAuthor ? stripHtml(rawAuthor) || null : null,
        publishedAt: toIso(tag("pubDate", raw) ?? tag("published", raw) ?? tag("updated", raw)),
        excerpt: desc ? stripHtml(desc) : null,
      } as FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
}
