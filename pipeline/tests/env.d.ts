/// <reference types="@cloudflare/vitest-pool-workers" />

// Fisier script global (fara import/export la nivel de top), deci `declare module`
// de mai jos e o declaratie ambientala pentru importul de text brut al .sql (?raw).
declare module "*.sql?raw" {
  const content: string;
  export default content;
}
