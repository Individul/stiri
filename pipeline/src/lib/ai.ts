export const MODELS = {
  embed: "@cf/baai/bge-m3",
  small: "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
  large: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
} as const;

export type AiLike = { run(model: string, input: unknown): Promise<any> };
