import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// Nu folosim configPath spre wrangver.toml de productie: acolo sunt declarate
// bindingurile AI si VECTORIZE, care NU au simulator local in miniflare
// (workerd nu poate rezolva __WRANGLER_EXTERNAL_AI_WORKER offline). In teste
// AI/Vectorize/Queue sunt oricum inlocuite cu fake-uri, deci avem nevoie doar
// de un D1 real, local. Il declaram inline.
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: "2025-01-01",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
        },
      },
    },
  },
});
