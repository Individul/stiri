import { describe, it, expect } from "vitest";
import { importanceScore, formatSourceCount } from "../src/lib/ranking";

describe("importanceScore", () => {
  it("creste cu numarul de surse", () => {
    const now = new Date("2025-09-02T12:00:00Z");
    const recent = "2025-09-02T11:00:00Z";
    expect(importanceScore(5, recent, now)).toBeGreaterThan(
      importanceScore(2, recent, now)
    );
  });
  it("scade cu vechimea", () => {
    const now = new Date("2025-09-02T12:00:00Z");
    const fresh = importanceScore(3, "2025-09-02T11:00:00Z", now);
    const old = importanceScore(3, "2025-08-30T11:00:00Z", now);
    expect(fresh).toBeGreaterThan(old);
  });
});

describe("formatSourceCount", () => {
  it("o sursa", () => { expect(formatSourceCount(1)).toBe("1 sursă"); });
  it("mai multe surse", () => { expect(formatSourceCount(5)).toBe("5 surse"); });
  it("peste 20", () => { expect(formatSourceCount(21)).toBe("21 de surse"); });
  it("exact 20 => de", () => { expect(formatSourceCount(20)).toBe("20 de surse"); });
  it("suta => de", () => { expect(formatSourceCount(100)).toBe("100 de surse"); });
  it("suta terminata 01 => fara de", () => { expect(formatSourceCount(101)).toBe("101 surse"); });
  it("suta terminata 15 => fara de", () => { expect(formatSourceCount(115)).toBe("115 surse"); });
  it("zero => fara de", () => { expect(formatSourceCount(0)).toBe("0 surse"); });
});
