import { describe, it, expect } from "vitest";
import { embed } from "../src/lib/embeddings";

describe("embed", () => {
  it("cheama bge-m3 si intoarce vectorul", async () => {
    const ai = {
      run: async (model: string, input: any) => {
        expect(model).toBe("@cf/baai/bge-m3");
        expect(input.text).toEqual(["salut"]);
        return { data: [[0.1, 0.2]] };
      },
    };
    const v = await embed("salut", ai);
    expect(v).toEqual([0.1, 0.2]);
  });
});
