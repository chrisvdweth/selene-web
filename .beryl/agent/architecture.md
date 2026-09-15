# Architecture

- Astro provides static routes, SEO metadata, layouts, and topic page generation.
- React owns the interactive graph search/focus surface.
- `src/data/topics.csv` and `src/data/prerequisites.csv` are canonical editable content.
- `scripts/render-notebooks.mjs` converts a small configured notebook fixture set into static pages at build time.
- Browser-only editor downloads CSV rather than mutating deployed data.

## Bounded Contexts

| Context | Owns | Does Not Own | Public Entry Point |
| --- | --- | --- | --- |
| [Context name] | [Domain concepts] | [Excluded concerns] | [Path/API] |

## Boundary Rules

1. A context may import only another context's public entry point.
2. Internal files of another context are forbidden imports.
3. External APIs, SDKs, and persistence details must be accessed through adapters.
4. Domain logic must not depend directly on HTTP objects, ORM records, UI state, or vendor client types.

## Public Interface Rule

Each context exposes one explicit public entry point:

- TypeScript: `src/<context>/index.ts`
- Python: `src/<context>/__init__.py`
- Go: exported symbols in `internal/<context>` via deliberate package API

## Forbidden Import Policy

Record concrete forbidden import patterns here once contexts exist:

- `[from] -> [to/internal/**]`
- `[from] -> [to/infrastructure/**]`

Keep this list small and high-signal. Add rules only after repeated boundary mistakes.
