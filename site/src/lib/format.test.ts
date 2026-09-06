import { describe, it, expect } from "vitest";
import { formatSourceCount, rankScore, fmtDataOra, fmtData } from "./format";

describe("formatSourceCount", () => {
  it("foloseste regula romaneasca pentru 'de'", () => {
    expect(formatSourceCount(1)).toBe("1 sursă");
    expect(formatSourceCount(5)).toBe("5 surse");
    expect(formatSourceCount(20)).toBe("20 de surse");
    expect(formatSourceCount(21)).toBe("21 de surse");
    expect(formatSourceCount(100)).toBe("100 de surse");
    expect(formatSourceCount(101)).toBe("101 surse");
  });
});

describe("rankScore", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const iso = "2026-09-06 12:00:00"; // acelasi moment ca `now`, format D1

  it("mai multe surse => scor mai mare (la aceeasi recenta)", () => {
    expect(rankScore(10, iso, now)).toBeGreaterThan(rankScore(3, iso, now));
  });

  it("mai vechi => scor mai mic (la acelasi numar de surse)", () => {
    const older = "2026-09-04 12:00:00"; // cu 2 zile mai vechi
    expect(rankScore(5, older, now)).toBeLessThan(rankScore(5, iso, now));
  });

  it("parseaza formatul D1 (fara T/Z) ca UTC", () => {
    // La momentul exact, decaderea = 1, deci scorul = numarul de surse.
    expect(rankScore(7, iso, now)).toBeCloseTo(7, 5);
  });
});

describe("fus orar Moldova", () => {
  it("afiseaza ora locala, nu UTC (+3 vara)", () => {
    // D1 scrie UTC: 16:04 UTC = 19:04 la Chisinau (EEST)
    expect(fmtDataOra("2026-09-06 16:04:00")).toContain("19:04");
    expect(fmtDataOra("2026-09-06 16:04:00")).toContain("6 septembrie");
  });
  it("data fara ora", () => {
    expect(fmtData("2026-09-06 16:04:00")).toBe("6 septembrie 2026");
  });
  it("intoarce sir gol pentru valoare lipsa", () => {
    expect(fmtDataOra(null)).toBe("");
  });
});
