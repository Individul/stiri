import { describe, it, expect } from "vitest";
import { decideCluster, DEFAULT_THRESHOLDS } from "../src/lib/cluster";

describe("decideCluster", () => {
  const t = DEFAULT_THRESHOLDS;
  it("similaritate mare => attach", () => {
    expect(decideCluster(0.9, t)).toBe("attach");
  });
  it("zona gri => confirm (LLM)", () => {
    expect(decideCluster(0.78, t)).toBe("confirm");
  });
  it("similaritate mica => new", () => {
    expect(decideCluster(0.5, t)).toBe("new");
  });
  it("fara candidat => new", () => {
    expect(decideCluster(null, t)).toBe("new");
  });
});
