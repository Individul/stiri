import { describe, it, expect } from "vitest";
import {
  extrageLinkuriFeed, numeSite, candidati, numaraArticole, descoperaFeed,
} from "./feed-discovery";

const PAGINA = `<html><head>
<title>Nord News — Știri din nordul Moldovei</title>
<link rel="alternate" type="application/rss+xml" href="/feed/" />
<link rel="alternate" type="application/rss+xml" href="/comments/feed/" />
<link rel="stylesheet" href="/style.css" />
</head><body>...</body></html>`;

describe("extrageLinkuriFeed", () => {
  it("ia doar link-urile de tip feed, absolutizate", () => {
    expect(extrageLinkuriFeed(PAGINA, "https://nordnews.md/")).toEqual([
      "https://nordnews.md/feed/",
      "https://nordnews.md/comments/feed/",
    ]);
  });
  it("intoarce gol daca pagina nu declara feed", () => {
    expect(extrageLinkuriFeed("<html><head></head></html>", "https://ex.md")).toEqual([]);
  });
});

describe("numeSite", () => {
  it("scoate numele din title, fara descriere", () => {
    expect(numeSite(PAGINA)).toBe("Nord News");
  });
  it("prefera og:site_name", () => {
    const h = `<meta property="og:site_name" content="Ziarul Meu" /><title>Altceva</title>`;
    expect(numeSite(h)).toBe("Ziarul Meu");
  });
});

describe("candidati", () => {
  it("exclude feed-ul de comentarii", () => {
    const c = candidati("https://nordnews.md/", extrageLinkuriFeed(PAGINA, "https://nordnews.md/"));
    expect(c).toContain("https://nordnews.md/feed/");
    expect(c.some((u) => u.includes("comments"))).toBe(false);
  });
  it("pune feed-urile in romana inaintea celorlalte", () => {
    const c = candidati("https://ex.md", ["https://ex.md/en/feed", "https://ex.md/ro/feed"]);
    expect(c[0]).toBe("https://ex.md/ro/feed");
  });
  it("adauga cai uzuale cand pagina nu declara nimic", () => {
    const c = candidati("https://ex.md", []);
    expect(c).toContain("https://ex.md/feed/");
    expect(c).toContain("https://ex.md/rss");
  });
});

describe("numaraArticole", () => {
  it("numara item si entry", () => {
    expect(numaraArticole("<rss><item>a</item><item>b</item></rss>")).toBe(2);
    expect(numaraArticole("<feed><entry>a</entry></feed>")).toBe(1);
    expect(numaraArticole("<html>nimic</html>")).toBe(0);
  });
});

describe("descoperaFeed", () => {
  it("gaseste feed-ul declarat in pagina", async () => {
    const fake = (async (u: string) => {
      if (u === "https://nordnews.md/") return new Response(PAGINA);
      if (u === "https://nordnews.md/feed/") return new Response("<rss><item>x</item></rss>");
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await descoperaFeed("https://nordnews.md/", fake);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.feedUrl).toBe("https://nordnews.md/feed/");
      expect(r.articole).toBe(1);
      expect(r.nume).toBe("Nord News");
    }
  });

  it("cade pe caile uzuale cand pagina nu declara feed", async () => {
    const fake = (async (u: string) => {
      if (u === "https://ex.md/") return new Response("<html><head></head></html>");
      if (u === "https://ex.md/rss") return new Response("<rss><item>x</item></rss>");
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await descoperaFeed("https://ex.md/", fake);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.feedUrl).toBe("https://ex.md/rss");
  });

  it("raporteaza ce a incercat cand nu gaseste nimic", async () => {
    const fake = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    const r = await descoperaFeed("https://ex.md/", fake);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.incercate.length).toBeGreaterThan(3);
  });

  it("ignora feed-urile care raspund 200 dar n-au articole", async () => {
    const fake = (async (u: string) => {
      if (u === "https://ex.md/") return new Response("<html></html>");
      if (u === "https://ex.md/feed/") return new Response("<html>pagina de eroare</html>");
      if (u === "https://ex.md/rss") return new Response("<rss><item>x</item></rss>");
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await descoperaFeed("https://ex.md/", fake);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.feedUrl).toBe("https://ex.md/rss");
  });
});
