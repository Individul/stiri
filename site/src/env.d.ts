/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Worker bindings (see ../wrangler.toml). Accessed at runtime via
// `import { env } from "cloudflare:workers"`. Astro v6+/@astrojs/cloudflare v14
// removed `Astro.locals.runtime.env`; the `cloudflare:workers` module is the
// supported way to reach bindings. The `Cloudflare.Env` interface is merged
// across declarations, so declaring `DB` here makes `env.DB` typed as D1Database.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
  }
}
