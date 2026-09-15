# Design Tree

- App shell: skip link, wordmark, section navigation, theme control, footer
  - Bench (home): the workbench — filter, index rail, current experiment, local dependencies
  - Experiments: searchable, category-filterable list of every indexed notebook
  - Notebook dossier: header, notebook actions, records table, styled rendered notebook
  - Dependencies: `show` / `mastery` / `ego`, each entering the workbench at a different scope
  - Path editor: local prerequisite CSV export
- Build tooling: notebook renderer (now emits a styled reading surface) and Sheets importer

## Current Design Concept

A prepared experiment rather than a diagram: inspect the concept, see what it depends on,
launch the notebook, change the inputs. The organizing move is replacing the global graph with
a **local dependency workbench** — an index rail beside one current experiment, with its
Requires / Unlocks / Nearby neighbourhood drawn top-to-bottom (prerequisites first) and
switchable between Local, Prerequisite chain and Neighbourhood scopes. Nothing is ever
presented as a relationship the data does not hold: "Nearby" is labelled *same category, not a
prerequisite*. The active notebook is always an explicit next action. Space Grotesk at 600
carries display, Inter is capped at 600 so nothing inherits a browser 700, and IBM Plex Mono
carries every measured value, identifier and record.

## Open Decisions

| Decision | Options | Current Lean | Why |
| --- | --- | --- | --- |
| Should the workbench remember the last selected experiment across visits? | no memory, `sessionStorage`, URL param | URL param | A shareable link is more useful than hidden state, and the graph routes already carry an id. |
| Should the rendered notebook follow the site theme or keep its own ground? | follow site, always light, reader choice | follow site | The renderer now writes `data-theme`, so a dark dossier no longer frames a white sheet. |

## Settled Decisions

| Decision | Choice | Date | ADR |
| --- | --- | --- | --- |
| What replaces the 82-node global graph? | A local dependency workbench, scoped to one experiment at a time | 2026-08-23 | n/a |
| How are relationships that are not prerequisites shown? | As "Nearby", explicitly labelled as same-category and not a prerequisite | 2026-08-23 | n/a |
| Are the three faces self-hosted? | Yes — latin/latin-ext woff2 subsets with `font-display: swap` and `OFL.txt`; no request leaves the origin | 2026-08-23 | n/a |
| Is the rendered notebook HTML styled? | Yes — `render-notebooks.mjs` emits a reading surface at a ~70-character measure; filenames and the manifest contract are unchanged | 2026-08-23 | n/a |
| Inter and Space Grotesk are flagged `overused-font` by the detector | Keep them; the pinned brief outranks the warning, justification recorded in BRAND-KIT.md | 2026-08-23 | n/a |

## Pressure Points

- 6 of 82 notebooks record a prerequisite, so the workbench must stay useful when a concept has
  no dependencies at all — the empty scope is a designed state, not a blank panel.
- `render-notebooks.mjs` is build tooling that now carries presentation. Its output contract
  (filenames, copied `.ipynb`, manifest fields) is fixed; only the stylesheet inside the HTML
  may change.
- The index rail and the diagram share one viewport on mobile; the rail is capped so the current
  experiment is never pushed below the fold.

## Recording Rule (Design Tree vs ADR)

Add or update this file when:

- A decision is still evolving.
- You are comparing options before implementation.
- The choice may still change after one or two implementation iterations.

Create an ADR when:

- The decision changes module boundaries, persistence shape, adapter contracts, security model, naming conventions used across contexts, or test strategy.
- Future contributors are likely to revisit the choice without clear repo history.
