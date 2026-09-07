import type { AiLike } from "./ai";

interface Row { step: string; model: string; neurons: number; calls: number; }

// Workers AI raporteaza Neuronii in doua locuri diferite, in functie de model:
//  - modelele de text (llama) => res.usage.neurons (format OpenAI),
//  - modelele de embeddings (bge-m3) => res.meta.neurons.
// Citim ambele, altfel embeddings-urile ies contorizate cu 0.
function neuroni(res: any): number {
  const n = res?.usage?.neurons ?? res?.meta?.neurons;
  return typeof n === "number" ? n : 0;
}

// Inconjoara binding-ul AI si aduna Neuronii consumati pe pas+model.
// La final de job, flush() scrie agregatul in tabelul `usage` din D1 (upsert pe ziua UTC).
export class Meter {
  private rows = new Map<string, Row>();

  wrap(step: string, ai: AiLike): AiLike {
    return {
      run: async (model: string, input: unknown) => {
        const res: any = await ai.run(model, input);
        const key = `${step}|${model}`;
        const r = this.rows.get(key) ?? { step, model, neurons: 0, calls: 0 };
        r.neurons += neuroni(res);
        r.calls += 1;
        this.rows.set(key, r);
        return res;
      },
    };
  }

  async flush(db: D1Database): Promise<void> {
    if (this.rows.size === 0) return;
    const day = new Date().toISOString().slice(0, 10);
    const stmt = db.prepare(
      `INSERT INTO usage (day, step, model, neurons, calls) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(day, step, model) DO UPDATE SET
         neurons = neurons + excluded.neurons,
         calls = calls + excluded.calls`
    );
    await db.batch([...this.rows.values()].map((r) => stmt.bind(day, r.step, r.model, r.neurons, r.calls)));
    this.rows.clear();
  }
}
