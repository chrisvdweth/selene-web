# SELENE Design

SELENE is a visual learning atlas for open, hands-on AI education. This shared base is an Astro + React application built around repository-owned topic and prerequisite data.

## Start

```bash
npm install
npm run dev
```

The bundled rendered notebooks let `npm run dev` and `npm run build` run without an external notebook clone. To regenerate those assets from a local source, set `SELENE_NOTEBOOK_SOURCE=/path/to/notebooks`. When no source is available, the generator retains the bundled assets; when an explicitly configured source is invalid, it fails with the underlying filesystem error.

## Content workflows

- Edit `src/data/topics.csv` for topic metadata and notebook mappings.
- Edit `src/data/prerequisites.csv` for directed learning-path edges, or use `/admin` to download an edited CSV.
- Import an exported/published Google Sheet: `npm run import:sheets -- 'https://docs.google.com/.../pub?output=csv'`.
- Notebook source remains external; do not bulk-copy the upstream notebook corpus into this base.

## Quality checks

```bash
npm run check
npm test
npm run build
./.beryl/scripts/check.sh
```

The app includes responsive light/dark UI, a searchable focus graph, static topic pages, notebook HTML/local/Colab actions, structured metadata, robots, and sitemap support through Astro.
