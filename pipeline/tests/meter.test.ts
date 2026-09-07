import { describe, it, expect } from "vitest";
import { Meter } from "../src/lib/meter";

function fakeDb(binds: any[]): any {
  return {
    prepare: () => ({ bind: (...a: any[]) => a }),
    batch: async (stmts: any[]) => { binds.push(...stmts); return []; },
  };
}

describe("Meter", () => {
  it("aduna neuroni si apeluri pe pas+model", async () => {
    const m = new Meter();
    const ai = { run: async () => ({ usage: { neurons: 5 } }) };
    const w = m.wrap("summarize", ai);
    await w.run("model-x", {});
    await w.run("model-x", {});
    const binds: any[] = [];
    await m.flush(fakeDb(binds));
    expect(binds).toHaveLength(1);
    const [day, step, model, neurons, calls] = binds[0];
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(step).toBe("summarize");
    expect(model).toBe("model-x");
    expect(neurons).toBe(10);
    expect(calls).toBe(2);
  });

  it("citeste neuronii si din meta (forma bge-m3)", async () => {
    const m = new Meter();
    // Raspuns real de la @cf/baai/bge-m3: fara `usage`, cu `meta.neurons`.
    const ai = { run: async () => ({ data: [[0.1]], meta: { neurons: 0.54, cost_metric_value_1: 503 } }) };
    const w = m.wrap("embed", ai);
    await w.run("bge", {});
    await w.run("bge", {});
    const binds: any[] = [];
    await m.flush(fakeDb(binds));
    expect(binds[0][3]).toBeCloseTo(1.08);
    expect(binds[0][4]).toBe(2);
  });

  it("trateaza lipsa oricarui camp de neuroni ca 0", async () => {
    const m = new Meter();
    const ai = { run: async () => ({ data: [[0.1]] }) };
    await m.wrap("embed", ai).run("bge", {});
    const binds: any[] = [];
    await m.flush(fakeDb(binds));
    expect(binds[0][3]).toBe(0);
    expect(binds[0][4]).toBe(1);
  });

  it("flush gol nu apeleaza db", async () => {
    const m = new Meter();
    let called = false;
    const db: any = { prepare: () => ({ bind: () => [] }), batch: async () => { called = true; return []; } };
    await m.flush(db);
    expect(called).toBe(false);
  });

  it("returneaza raspunsul AI neschimbat", async () => {
    const m = new Meter();
    const ai = { run: async () => ({ response: "DA", usage: { neurons: 1 } }) };
    const res = await m.wrap("confirm", ai).run("llama", {});
    expect(res.response).toBe("DA");
  });
});
