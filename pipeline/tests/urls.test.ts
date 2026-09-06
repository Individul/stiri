import { describe, it, expect } from "vitest";
import { normalizeUrl, titlesNearlyIdentical } from "../src/lib/urls";

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
