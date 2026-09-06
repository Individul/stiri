import { describe, it, expect } from "vitest";
import { summarizeCluster } from "../src/lib/summarize";

const payload = { title: "Titlu canonic", category: "Politică", summary: "Rezumat." };

describe("summarizeCluster", () => {
  it("parseaza JSON-ul returnat de model", async () => {
    const ai = { run: async () => ({ response: JSON.stringify(payload) }) };
    const r = await summarizeCluster([{ source: "Agora", title: "t1", text: "corp 1" }], ai);
    expect(r).toEqual(payload);
  });
  it("o singura sursa => modelul mic", async () => {
    let used = "";
    const ai = { run: async (m: string) => { used = m; return { response: JSON.stringify(payload) }; } };
    await summarizeCluster([{ source: "A", title: "t", text: "x" }], ai);
    expect(used).toBe("@cf/meta/llama-3.1-8b-instruct-fp8-fast");
  });
  it("mai multe surse => modelul mare", async () => {
    let used = "";
    const ai = { run: async (m: string) => { used = m; return { response: JSON.stringify(payload) }; } };
    await summarizeCluster([
      { source: "A", title: "t1", text: "x" },
      { source: "B", title: "t2", text: "y" },
    ], ai);
    expect(used).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  });
  it("categorie invalida => Altele", async () => {
    const ai = { run: async () => ({ response: JSON.stringify({ ...payload, category: "Aiurea" }) }) };
    const r = await summarizeCluster([{ source: "A", title: "t", text: "x" }], ai);
    expect(r.category).toBe("Altele");
  });
  it("arunca daca raspunsul nu contine JSON", async () => {
    const ai = { run: async () => ({ response: "Nu pot raspunde." }) };
    await expect(summarizeCluster([{ source: "A", title: "t", text: "x" }], ai)).rejects.toThrow();
  });
  it("arunca daca lipsesc title/summary", async () => {
    const ai = { run: async () => ({ response: JSON.stringify({ category: "Politică" }) }) };
    await expect(summarizeCluster([{ source: "A", title: "t", text: "x" }], ai)).rejects.toThrow();
  });
  it("accepta response obiect deja parsat (format Workers AI real)", async () => {
    const ai = { run: async () => ({ response: { ...payload } }) };
    const r = await summarizeCluster([{ source: "A", title: "t", text: "x" }], ai);
    expect(r).toEqual(payload);
  });
  it("accepta choices[].message.content (format OpenAI)", async () => {
    const ai = { run: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) };
    const r = await summarizeCluster([{ source: "A", title: "t", text: "x" }], ai);
    expect(r).toEqual(payload);
  });
});
