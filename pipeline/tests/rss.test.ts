import { describe, it, expect } from "vitest";
import { parseFeed } from "../src/lib/rss";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Titlu unu</title><link>https://ex.md/a</link>
<pubDate>Tue, 02 Sep 2025 08:00:00 +0300</pubDate>
<description><![CDATA[Un <b>rezumat</b> scurt.]]></description></item>
<item><title>Titlu doi</title><link>https://ex.md/b</link></item>
</channel></rss>`;

describe("parseFeed", () => {
  it("extrage item-urile RSS 2.0", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe("https://ex.md/a");
    expect(items[0].title).toBe("Titlu unu");
    expect(items[0].publishedAt).toBe("2025-09-02T05:00:00.000Z");
    expect(items[0].excerpt).toBe("Un rezumat scurt.");
  });

  it("nu pică pe item fără dată/descriere", () => {
    const items = parseFeed(RSS);
    expect(items[1].publishedAt).toBeNull();
    expect(items[1].excerpt).toBeNull();
  });
});
