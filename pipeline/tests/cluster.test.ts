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

import { alegePastrat } from "../src/lib/db";

describe("alegePastrat", () => {
  it("pastreaza mereu clusterul mai vechi (id mai mic)", () => {
    expect(alegePastrat(17, 40)).toEqual({ pastrat: 17, absorbit: 40 });
  });
  it("directia nu depinde de ordinea argumentelor", () => {
    expect(alegePastrat(40, 17)).toEqual(alegePastrat(17, 40));
  });
  it("doua joburi concurente nu se pot absorbi reciproc", () => {
    const a = alegePastrat(5, 9), b = alegePastrat(9, 5);
    expect(a.pastrat).toBe(b.pastrat);
  });
});
