import { describe, it, expect } from "vitest";
import { parseFeed } from "../src/lib/rss";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Titlu unu</title><link>https://ex.md/a</link>
<pubDate>Tue, 02 Sep 2025 08:00:00 +0300</pubDate>
<description><![CDATA[Un <b>rezumat</b> despre educa&#539;ie&#8230;]]></description></item>
<item><title>Titlu doi</title><link>https://ex.md/b</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry>
<title>Titlu Atom</title>
<link rel="edit" href="https://ex.md/edit/1"/>
<link rel="self" href="https://ex.md/self/1"/>
<link rel="alternate" href="https://ex.md/articol"/>
<author><name>Ion Creangă</name></author>
<published>2025-09-03T10:00:00Z</published>
<summary>Un articol despre educa&#539;ie</summary>
</entry>
</feed>`;

describe("parseFeed", () => {
  it("extrage item-urile RSS 2.0", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe("https://ex.md/a");
    expect(items[0].title).toBe("Titlu unu");
    expect(items[0].publishedAt).toBe("2025-09-02T05:00:00.000Z");
    expect(items[0].excerpt).toBe("Un rezumat despre educație…");
  });

  it("nu pică pe item fără dată/descriere", () => {
    const items = parseFeed(RSS);
    expect(items[1].publishedAt).toBeNull();
    expect(items[1].excerpt).toBeNull();
  });

  it("procesează entry-urile Atom (link alternate, autor, entități numerice)", () => {
    const items = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://ex.md/articol");
    expect(items[0].title).toBe("Titlu Atom");
    expect(items[0].author).toBe("Ion Creangă");
    expect(items[0].publishedAt).toBe("2025-09-03T10:00:00.000Z");
    expect(items[0].excerpt).toContain("educație");
  });
});
