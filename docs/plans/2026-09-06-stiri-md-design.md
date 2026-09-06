# Design — Știri MD (agregator de știri dedus)

**Data:** 2026-09-06
**Aplicație:** `apps/stiri`
**Autor:** Dumitru Prisacaru (+ Claude)

## Scop

Un site public care colectează știrile publicate de site-urile de știri din Republica
Moldova și le afișează într-un format simplu, ușor de citit, fără bannere și
publicitate. Când aceeași știre apare la mai multe surse, ea **nu se dublează**: rămâne
o singură intrare, cu un **rezumat sintetizat din toate sursele** și un indicator al
numărului de surse. Model de referință: https://frontpage.ink/

## Decizii cheie

| Aspect | Decizie |
|--------|---------|
| Model de conținut | Rezumat sintetizat din toate sursele (câteva paragrafe, în română), cu atribuire la fiecare sursă. Nu republicăm textul integral. |
| Surse | Doar limba română, doar R. Moldova. Trebuie să fie **ușor de adăugat surse noi** ⇒ sursele stau în DB, nu hardcodate. |
| Deduplicare | Embeddings (generare candidați) → confirmare LLM pentru zona gri → grupare. |
| Embeddings | Cloudflare Workers AI `@cf/baai/bge-m3` (multilingv, 1024 dim). |
| Confirmare dedup + rezumat single-sursă | Workers AI `@cf/meta/llama-3.1-8b-instruct-fp8-fast` (ieftin). |
| Rezumat sintetizat multi-sursă | Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (calitate mai bună, doar pentru clustere cu ≥2 surse). |
| AI | Totul pe Cloudflare Workers AI — fără chei externe (Claude/Voyage). |
| Platformă | Cloudflare (Pages + Workers + Queues + Cron + D1 + Vectorize + Workers AI). |
| Framework site | Astro (SSR, ~0 JS, rapid, adaptor Cloudflare). |

**Cost estimat:** ~$8–10/lună la ~300 articole/zi (embeddings, dedup și rezumatele single-sursă
încap aproape integral în alocația gratuită de 10.000 Neuroni/zi; costul vine din `llama-3.3-70b`
folosit doar pe clusterele cu mai multe surse). Logica de sinteză stă izolată în `summarize.ts`,
deci se poate comuta ulterior pe alt model (ex. Claude) printr-o singură modificare.

## Arhitectură (Cloudflare)

- **D1 (SQLite):** date relaționale — surse, articole, clustere (știri), legături.
- **Vectorize:** index de vectori pentru pasul de candidați la deduplicare
  (dim 1024 = bge-m3), metadate `{article_id, published_at, cluster_id}`.
- **Workers AI:** embeddings (`bge-m3`) + generare text (`llama-3.1-8b`, `llama-3.3-70b`),
  prin binding-ul `AI`, fără chei externe.
- **Queues:** procesarea articolelor pe bucăți, fără timeout de Worker.
- **Cron Trigger (~10 min):** pornește ciclul de descoperire.
- **Cloudflare Pages (Astro):** site-ul public de citit.

## Model de date (D1)

- `sources` — `id`, `name`, `site_url`, `feed_url` (RSS), `enabled`, `created_at`.
- `articles` — `id`, `source_id`, `url` (unic), `title`, `author`, `published_at`,
  `extracted_text`, `vector_id`, `cluster_id` (nullable), `status`, `fetched_at`.
- `clusters` (= o știre) — `id`, `canonical_title`, `summary_md`, `category`,
  `first_seen_at`, `last_updated_at`, `source_count`, `importance_score`.
- `nr_surse` și lista de surse se derivă din `articles` cu același `cluster_id`.

## Pipeline (fiecare pas = job în Queue)

1. **Descoperire** — pentru fiecare sursă activă, citim RSS, găsim URL-uri noi
   (necunoscute în `articles`), le inserăm cu `status=new`, enqueue fetch. Adăugarea
   unei surse noi o face automat parte din acest pas.
2. **Extragere text** — aducem pagina articolului, extragem corpul curat (HTMLRewriter,
   euristică de tip readability); fallback pe rezumatul din RSS.
3. **Embedding** — `bge-m3` (Workers AI) pe titlu+lead ⇒ upsert în Vectorize, salvăm `vector_id`.
4. **Clustering / dedup** — query top-K în Vectorize (ultimele ~48h):
   - similaritate ≥ prag_înalt ⇒ atașăm automat la cluster;
   - zonă gri (între praguri) ⇒ **`llama-3.1-8b` confirmă** „același eveniment?" (structurat, ieftin);
   - altfel ⇒ cluster nou.
   Chemăm LLM doar în zona gri ⇒ cost controlat.
5. **Sumarizare** — când un cluster e nou sau primește o sursă nouă, scriem rezumatul +
   titlul canonic + categoria din toate articolele membre. **Alegerea modelului după
   numărul de surse:** cluster cu **o singură sursă** ⇒ `llama-3.1-8b` (ieftin); cluster
   cu **≥2 surse** ⇒ `llama-3.3-70b` (sinteza care contează). Actualizăm `source_count`
   și `importance_score` (nr_surse + decădere pe recență).

## Site public (Astro pe Pages)

- **`/` (acasă):** listă de știri sortate după importanță/recență; card = titlu, lead,
  badge „N surse", categorie, timp.
- **`/s/[id]` (știre):** rezumatul complet, tipografie curată, zero reclame, + lista
  tuturor surselor cu link, titlul original și ora.
- **Filtru pe categorie** (simplu).
- **Admin surse:** pagină protejată (Cloudflare Access) pentru adăugare/dezactivare
  surse. MVP: surse seed-uite la instalare + formular de adăugare.

## Tratarea erorilor

- Feed indisponibil / articol care nu se poate aduce ⇒ marcăm `status=error`, reîncercăm
  la ciclul următor, nu blocăm restul.
- Extragere eșuată ⇒ fallback pe excerptul din RSS.
- Workers AI eroare sau rate-limit ⇒ retry cu backoff prin Queue (mesaj rămâne
  neconfirmat), articolul rămâne în starea anterioară.
- Deduplicare incertă ⇒ preferăm cluster nou (fals negativ) în loc de a lipi greșit
  două știri diferite (fals pozitiv), care e mai vizibil pentru cititor.

## Testare

- Unit: parsarea RSS, extragerea textului (pe HTML fixat), pragurile de clustering,
  formatarea numărului de surse.
- Integrare: pipeline pe un set de articole fixate (fixtures), cu binding-ul Workers AI
  mock-uit, verificând că duplicatele ajung în același cluster și unicele în clustere separate.
- E2E ușor: randarea paginii de acasă și a paginii de știre din date de test.

## Amânat (YAGNI acum)

Căutare, notificări, conturi de utilizator, surse în rusă cu traducere, aplicație mobilă.
