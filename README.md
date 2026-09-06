# Știri MD — agregator de știri

Colectează știrile din presa din Republica Moldova (limba română), le **deduplică pe
subiect** și afișează un **rezumat sintetizat din toate sursele**, într-un format curat,
fără reclame. Când aceeași știre apare la mai multe surse, rămâne o singură intrare, cu un
indicator „N surse". Model de referință: [frontpage.ink](https://frontpage.ink/).

**100% pe Cloudflare, fără chei/API externe.**

## Arhitectură

Două sub-proiecte, care partajează aceeași bază **D1** și același index **Vectorize**:

| Dir | Ce e | Cloudflare |
|-----|------|-----------|
| [`pipeline/`](pipeline/) | Worker: Cron → Queues → colectare RSS, extragere text, embeddings, clustering, rezumat | Workers, Cron Triggers, Queues, D1, Vectorize, Workers AI |
| [`site/`](site/) | Site public de citit (Astro) | Pages, D1, Workers AI (indirect) |

### Pipeline (la fiecare ~10 min)
1. **Descoperire** — citește RSS-ul surselor active, inserează articolele noi, pune joburi în coadă.
2. **Extragere text** — aduce pagina articolului, extrage corpul (fallback pe excerptul RSS).
3. **Embedding** — `@cf/baai/bge-m3` (Workers AI) → upsert în Vectorize.
4. **Clustering** — top-K în Vectorize; similaritate mare ⇒ atașează; zonă gri ⇒ `llama-3.1-8b`
   confirmă „același eveniment?"; altfel ⇒ cluster nou.
5. **Sumarizare** — `llama-3.1-8b` pentru clustere cu o sursă, `llama-3.3-70b` pentru ≥2 surse.

### Modele Workers AI
- Embeddings: `@cf/baai/bge-m3` (1024 dim, multilingv)
- Confirmare dedup + rezumat single-sursă: `@cf/meta/llama-3.1-8b-instruct-fp8-fast`
- Rezumat sintetizat multi-sursă: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

**Cost estimat:** ~$8–10/lună la ~300 articole/zi (restul încape în alocația gratuită de
10.000 Neuroni/zi). Modelele sunt izolate în `pipeline/src/lib/ai.ts` + `summarize.ts`, deci
se pot comuta ulterior (ex. pe Claude) printr-o singură modificare.

## Setup (o singură dată)

Necesită `wrangler login` și un cont Cloudflare cu **Workers AI activat** (dashboard → AI).
Fără chei/secrete externe.

```bash
cd apps/stiri/pipeline
npm install

# Creează resursele Cloudflare
npx wrangler d1 create stiri
npx wrangler vectorize create stiri-articles --dimensions=1024 --metric=cosine
npx wrangler queues create stiri-jobs
npx wrangler queues create stiri-dlq
```

Copiază `database_id` returnat de `d1 create` în **două** locuri (înlocuind `"TODO"`):
- `pipeline/wrangler.toml` → `[[d1_databases]] database_id`
- `site/wrangler.jsonc` → `d1_databases[0].database_id`

## Migrare + seed

```bash
cd apps/stiri/pipeline
npm run migrate:remote                                          # aplica schema pe D1
npx wrangler d1 execute stiri --remote --file=seeds/sources.sql # surse initiale
```

> Verifică URL-urile RSS din `seeds/sources.sql` — unele site-uri pot avea alt path sau feed lipsă.

## Deploy

```bash
# Pipeline (Worker + Cron + Queues)
cd apps/stiri/pipeline
npm run deploy

# Site (Cloudflare Pages)
cd ../site
npm run build
npx wrangler pages deploy dist --project-name stiri-site
```

Leagă binding-urile pe proiectul Pages (dashboard sau `wrangler.jsonc`): `DB` (D1 `stiri`).
Site-ul citește D1 prin `import { env } from "cloudflare:workers"`.

## Dezvoltare

```bash
cd apps/stiri/pipeline && npm test        # 31 teste (unit + integrare)
cd apps/stiri/pipeline && npm run typecheck
cd apps/stiri/site && npm test && npm run build && npx astro check
```

Testul de integrare rulează pe miniflare cu D1 local real și AI/Vectorize/Queue mock-uite
(bindings-urile AI/Vectorize nu au simulator local, de aceea `vitest.config.ts` declară doar
D1 local, nu întreg `wrangler.toml`).

## Adăugarea surselor

MVP: prin SQL.

```bash
cd apps/stiri/pipeline
npx wrangler d1 execute stiri --remote \
  --command "INSERT OR IGNORE INTO sources (name, site_url, feed_url) VALUES ('Nume','https://site.md','https://site.md/rss')"
```

Dezactivare: `UPDATE sources SET enabled = 0 WHERE id = ?`. O sursă nouă activă intră
automat în ciclul de descoperire. (Ulterior: pagină de admin protejată cu Cloudflare Access —
vezi planul, Faza 7.)

## Status implementare

Gata și testat (fără cont necesar): pipeline complet (colectare → dedup → rezumat), schema
D1, seed, site-ul de citit. Rămâne de făcut de tine: **provisioning-ul Cloudflare de mai sus**,
migrare/seed pe remote, deploy. Opțional: admin surse (Faza 7).

Detalii: [`docs/plans/2026-09-06-stiri-md-design.md`](../../docs/plans/2026-09-06-stiri-md-design.md)
și [`docs/plans/2026-09-06-stiri-md.md`](../../docs/plans/2026-09-06-stiri-md.md).
