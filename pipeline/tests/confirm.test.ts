import { describe, it, expect } from "vitest";
import { confirmSameEvent } from "../src/lib/summarize";

describe("confirmSameEvent", () => {
  it("interpreteaza DA ca true", async () => {
    const ai = { run: async () => ({ response: "DA" }) };
    const r = await confirmSameEvent({ title: "x", excerpt: "" }, { title: "y", excerpt: "" }, ai);
    expect(r).toBe(true);
  });
  it("interpreteaza NU ca false", async () => {
    const ai = { run: async () => ({ response: "NU, sunt diferite" }) };
    const r = await confirmSameEvent({ title: "x", excerpt: "" }, { title: "y", excerpt: "" }, ai);
    expect(r).toBe(false);
  });
  it("foloseste modelul mic", async () => {
    let used = "";
    const ai = { run: async (m: string) => { used = m; return { response: "DA" }; } };
    await confirmSameEvent({ title: "x", excerpt: "" }, { title: "y", excerpt: "" }, ai);
    expect(used).toBe("@cf/meta/llama-3.1-8b-instruct-fp8-fast");
  });
  it("nu confunda „Dacă” cu DA", async () => {
    const ai = { run: async () => ({ response: "Dacă e vorba de..." }) };
    const r = await confirmSameEvent({ title: "x", excerpt: "" }, { title: "y", excerpt: "" }, ai);
    expect(r).toBe(false);
  });
  it("citeste raspunsul si din choices[].message.content", async () => {
    const ai = { run: async () => ({ choices: [{ message: { content: "DA" } }] }) };
    const r = await confirmSameEvent({ title: "x", excerpt: "" }, { title: "y", excerpt: "" }, ai);
    expect(r).toBe(true);
  });
});
