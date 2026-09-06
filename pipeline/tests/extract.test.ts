import { describe, it, expect } from "vitest";
import { extractText } from "../src/lib/extract";

const HTML = `<html><head><style>.x{}</style></head><body>
<nav><p>Meniu</p></nav>
<article>
<p>Prea scurt.</p>
<p>Primul paragraf al stirii, destul de lung ca sa conteze.</p>
<p>Al doilea paragraf cu <a href="#">link</a> si detalii.</p>
<script>var x=1;</script>
</article></body></html>`;

describe("extractText", () => {
  it("extrage paragrafele articolului", () => {
    const t = extractText(HTML);
    expect(t).toContain("Primul paragraf");
    expect(t).toContain("Al doilea paragraf cu link si detalii.");
    expect(t).not.toContain("var x");
    expect(t).not.toContain("Meniu");
  });
  it("elimina paragrafele prea scurte", () => {
    expect(extractText(HTML)).not.toContain("Prea scurt");
  });
});
