function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

export function extractText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const nav = /<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi;
  const body = cleaned.replace(nav, "");
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 20);
  return paras.join("\n\n");
}
