import { MODELS, type AiLike } from "./ai";

export async function embed(text: string, ai: AiLike): Promise<number[]> {
  const res = await ai.run(MODELS.embed, { text: [text.slice(0, 8000)] });
  const vector = res?.data?.[0];
  if (!Array.isArray(vector)) throw new Error("bge-m3: raspuns invalid");
  return vector as number[];
}
