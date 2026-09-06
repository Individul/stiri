import { describe, it, expect } from "vitest";
import { normalizeUrl, titlesNearlyIdentical, feedUrlAntiCache } from "../src/lib/urls";

describe("feedUrlAntiCache", () => {
  // Aliniat la inceputul unei ferestre de 10 minute, ca sa testam corect limitele.
  const t0 = Math.floor(1_788_700_000_000 / 600_000) * 600_000;
  it("adauga un parametru care ocoleste cache-ul", () => {
    expect(feedUrlAntiCache("https://observatorul.md/feed/", t0))
      .toBe(`https://observatorul.md/feed/?_=${Math.floor(t0 / 600000)}`);
  });
  it("acelasi URL in interiorul aceluiasi ciclu de 10 minute", () => {
    expect(feedUrlAntiCache("https://ex.md/feed", t0))
      .toBe(feedUrlAntiCache("https://ex.md/feed", t0 + 5 * 60_000));
  });
  it("URL diferit la ciclul urmator", () => {
    expect(feedUrlAntiCache("https://ex.md/feed", t0))
      .not.toBe(feedUrlAntiCache("https://ex.md/feed", t0 + 11 * 60_000));
  });
  it("pastreaza parametrii existenti", () => {
    expect(feedUrlAntiCache("https://ex.md/rss?lang=ro", t0)).toContain("lang=ro");
  });
});

describe("normalizeUrl", () => {
  it("scoate parametrii de urmarire", () => {
    expect(normalizeUrl("https://unimedia.info/ro/news/x.html?utm_source=rss&utm_medium=rss"))
      .toBe("https://unimedia.info/ro/news/x.html");
  });
  it("pastreaza parametrii utili", () => {
    expect(normalizeUrl("https://ex.md/a?id=7&utm_campaign=rss")).toBe("https://ex.md/a?id=7");
  });
  it("scoate fragmentul si slash-ul final", () => {
    expect(normalizeUrl("https://ex.md/a/#comentarii")).toBe("https://ex.md/a");
  });
  it("nu scoate www (URL-ul trebuie sa ramana functional)", () => {
    expect(normalizeUrl("https://www.zdg.md/feed")).toBe("https://www.zdg.md/feed");
  });
  it("intoarce textul brut daca nu e URL valid", () => {
    expect(normalizeUrl("  nu-i url  ")).toBe("nu-i url");
  });
});

describe("titlesNearlyIdentical", () => {
  it("prinde titlul editat din cazul real Unimedia", () => {
    const a = "„Ne este greu să vorbim despre ea la trecut”: Coordonatoarea Consiliului de Elevi a murit";
    const b = "„Este greu să vorbim despre ea la trecut”: Coordonatoarea Consiliului de Elevi a murit";
    expect(titlesNearlyIdentical(a, b)).toBe(true);
  });
  it("identic dupa normalizare", () => {
    expect(titlesNearlyIdentical("Titlu, cu semne!", "titlu cu semne")).toBe(true);
  });
  it("nu confunda stiri diferite", () => {
    expect(titlesNearlyIdentical(
      "Alegeri în Germania: AfD obține scor istoric",
      "Premierul cere simplificarea regulilor pentru micii producători"
    )).toBe(false);
  });
  it("nu uneste titluri scurte care se contin din intamplare", () => {
    expect(titlesNearlyIdentical("Sport", "Sport si cultura in Moldova azi")).toBe(false);
  });
});
