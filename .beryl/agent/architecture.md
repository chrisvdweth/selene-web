# SELENE Architecture

SELENE is an Astro static site with small React islands. Cloudflare Pages serves the generated `dist/` directory worldwide. The application intentionally has no application database or runtime API.

## Bounded Contexts

| Context | Owns | Does not own | Public entry point |
| --- | --- | --- | --- |
| Notebook source | Upstream GitHub resolution, immutable snapshots, checksums, original-to-standalone mapping | Rendering, catalogue display, UI URLs | `scripts/fetch-notebooks.mjs` and `src/data/notebook-provenance.json` |
| Content build | Safe notebook parsing, rendered HTML, generated topic discovery | Network access or path curation | `scripts/render-notebooks.mjs` |
| Learning catalogue | Curated topic metadata, prerequisite DAG, topic/link validation | Raw notebook fetching and UI state | `src/lib/topics.ts` and `src/lib/notebook-links.ts` |
| Learner interface | Astro routes, accessible reading/search/path interfaces, progressive enhancement | Content mutation or remote API access | `src/pages/` and `src/components/` |
| Release | Static build, Cloudflare headers/redirects, previews, scheduled sync, release checks | Content semantics | `.github/workflows/` and `public/_headers` |

## Data Flow

```text
upstream master -> resolved commit SHA -> cached source snapshot
                -> provenance + standalone mapping -> renderer -> tracked rendered HTML + generated topics
                -> schema/link validation -> Astro build -> Cloudflare Pages
```

The scheduled workflow proposes source updates in a pull request. A production build consumes only committed generated artifacts and provenance, never a live branch tip.

## Data Ownership

- `src/data/topics.csv` owns human-curated topic labels, summaries, categories, levels, and stable IDs.
- `src/data/prerequisites.csv` is the sole source of prerequisite edges.
- `src/data/generated-topics.json` is generated discovery metadata; do not hand-edit it.
- `src/data/notebook-provenance.json` records the upstream commit, checksum, and standalone mapping; do not hand-edit it.
- `public/notebooks/*.html` are generated, reviewed reading artifacts. Raw `.ipynb` files are never published by this application; standalone downloads come from upstream.

## Boundary Rules

1. Only the notebook-source scripts access GitHub or the local source cache.
2. Browser code must not fetch, execute, or parse notebooks.
3. Catalogue code accepts validated data only and has no network dependency.
4. Generated notebook HTML is treated as untrusted content: escaped/sanitized before publishing.
5. The learner interface may create links through the notebook-link builder but may not construct vendor URLs itself.
6. Static Pages configuration uses no Functions. If a future feature needs state or writes, introduce a separate authenticated API boundary and ADR.
