# SELENE design refinement brief

You are refining one SELENE design branch so it reads as a **thoughtful, human-authored
educational product** rather than an AI-generated landing page. Evolve the existing
direction. Do not restart from scratch.

## Working rules

- Work only inside this worktree. Never touch other worktrees, `main`, or `/home/prane/coding/SELENE-Design`.
- `node_modules` is a symlink to the shared install. **Never run `npm install`.** Playwright is
  already installed there (`--no-save`); reinstalling would delete it.
- `design-review/`, `.kiro/`, `PRODUCT.md`, `DESIGN.md` are git-excluded. Do not commit them and
  do not add them to `.gitignore`.
- Commit incrementally on the current branch with focused messages. Never commit generated
  notebook output (`public/notebooks/` is ignored).

## The Impeccable skill is the design process

The skill is installed at `.kiro/skills/impeccable/`. Use it, do not paraphrase it.

1. `node .kiro/skills/impeccable/scripts/context.mjs --target src/pages/index.astro` (once).
2. Read the playbook that owns each pass before that pass, e.g.
   `.kiro/skills/impeccable/reference/audit.md`, `critique.md`, `layout.md`, `typeset.md`,
   `adapt.md`, `distill.md`, `quieter.md`, `polish.md`, `harden.md`, `onboard.md`,
   `operate.md`, `colorize.md`.
3. Read `.kiro/skills/impeccable/reference/craft-floor.md` immediately before you edit UI.
   Its bans are binding.
4. This is **refinement, not redesign**: keep the incumbent identity, copy, behaviour and
   everything outside scope. Do not invent product claims.
5. Run the deterministic detector after each pass and drive findings to zero or a written
   justification: `npx --no-install impeccable detect src` (fallback: `npx -y impeccable@latest detect src`).
6. Record durable design decisions in this branch's `BRAND-KIT.md` and
   `.beryl/agent/design-tree.md`. Keep `DESIGN.md`/`PRODUCT.md` as untracked working context.

Surface modes: `/` and `/about` are **Persuade-leaning but restrained**; `/topics`,
`/graph/*`, `/admin` are **Operate**; `/topics/[id]` is **Read** (a notebook dossier).

## Verification harness (already written — use it, extend it if useful)

Start the dev server on **your assigned port** (see `PORT` below):

```bash
node scripts/render-notebooks.mjs
npx astro dev --port <PORT> &
```

Screenshots + objective defect scan across 8 routes x {desktop 1440, mobile 390} x {light, dark}:

```bash
node design-review/shoot.mjs --base http://localhost:<PORT> --out design-review/before
node design-review/shoot.mjs --base http://localhost:<PORT> --out design-review/pass1
node design-review/shoot.mjs --base http://localhost:<PORT> --out design-review/after
```

It reports horizontal overflow, elements spilling past the viewport, sub-44px touch targets,
console errors, and the observed type scale (use this to prove you reduced font-size sprawl).
It writes `report.json` next to the images.

Functional regression suite — **must stay at or above the baseline of 31/33, and the two known
baseline failures must be fixed so you reach 33/33**:

```bash
node design-review/verify.mjs --base http://localhost:<PORT>
```

Known baseline failures to fix:
1. `/topics` has no search input although the nav labels it "Search Topics".
2. Four header controls are clipped off-screen at 390px — the mobile header is a squeezed
   desktop header, not a deliberate mobile navigation.

**Look at the screenshots with your image-reading tool.** The scanner cannot see ugliness.

## Confirmed defects in the shared base (fix all that survive on this branch)

- **Atlas graph is broken, not just plain.** `KnowledgeGraph.tsx` lays 82 nodes out on a
  hard-coded 3-column grid inside a fixed `viewBox="0 0 1000 540"`, so most nodes render far
  below the visible area and the shell clips them. No prerequisite edges are drawn at all,
  even though prerequisites exist in the data. Labels are truncated mid-word and collide with
  the circle edge. Fix the layout, draw the relationships you already have, and give the graph
  a real empty state for a search with no matches.
- Every node is a 42px filled circle with a drop shadow and a decorative halo: icon-soup /
  excessive-elevation territory.
- `svg { background: radial-gradient(...) }` in `global.css` is purely decorative colour. Remove it.
- `.notice` uses a 3px accent left border — the detector's `side-tab` rule, "the most
  recognizable tell of AI-generated UIs".
- Only 6 of 82 topics have curated metadata; the rest fall back to generated intros. Dense and
  missing metadata both need designed treatments, not raw dumps.
- Radii are inconsistent and mostly oversized: 24px shells and cards, 9px inputs, 100px pills.
- The type scale is sprawling and the hero is a slogan at `clamp(2.6rem, 7vw, 5.7rem)` with
  `letter-spacing:-.07em`. Fewer sizes, intentional measure, editorial hierarchy.
- `src/styles/global.css`, the `.astro` pages and `KnowledgeGraph.tsx` are written as single
  minified lines. Reformat them into readable, maintainable source as you work — this is
  explicitly in scope.
- `nav a { display: none }` at `max-width:700px` combined with `mobile-nav.css` leaves the
  header clipped instead of collapsing deliberately.

## Hard constraints — do not break these

- Do not alter the notebook data model (`src/lib/topics.ts` shape, `src/data/topics.csv`
  columns, `src/data/generated-topics.json`, `scripts/render-notebooks.mjs` output contract).
- Do not change graph relationships or the contents of `src/data/prerequisites.csv`.
- Keep all three notebook actions on the topic page: rendered HTML, `.ipynb` download with the
  `download` attribute, and the Colab URL exactly as constructed today.
- Keep the Google Sheets import workflow (`scripts/import-sheets-csv.mjs`, `npm run import:sheets`).
- Keep the `/admin` prerequisite editor behaviour: seeded textarea, local-only edits,
  client-side CSV download.
- Keep `/graph/show|mastery|ego/[id]` routes, the sitemap/robots/structured data, and the
  light/dark toggle.
- Do not weaken `tests/topics.test.ts`. If a test must change, run
  `./.beryl/scripts/update-test-manifest.sh` and explain why.

## Craft targets

- Typography: a small, deliberate scale; one display face plus one text face at most (plus mono
  for data); 60–75 character measure for prose; comfortable line-height; AA contrast in both themes.
- Controls: consistent height, padding, radius, hover, focus-visible and disabled treatment
  across buttons, links, tags, inputs, nav and cards. Focus must be visible in both themes.
- Colour: category colour is the only semantic colour and is always paired with text. No
  gradients, no decorative colour, no colour-only meaning.
- Restraint and authorship: editorial whitespace, asymmetry where it earns its place, one or two
  strong motifs, no glassmorphism, no pill overload, no icon soup, no feature-card grid filler,
  minimal shadows.
- Mobile: no horizontal overflow, ≥44px targets, a deliberate mobile navigation, readable dense
  notebook content, and graph controls that work by touch.
- Accessibility and semantics: real landmarks and headings, labelled controls, keyboard paths
  that duplicate every pointer-only graph action, `prefers-reduced-motion` respected.
- Performance: keep it a static Astro site. No new heavy dependencies. No webfont pile-up —
  if you add a face, self-host or use at most two families with `font-display: swap`.

## Definition of done

1. `design-review/before/` and `design-review/after/` both captured, and you have visually
   compared them.
2. `node design-review/verify.mjs` → 33/33.
3. `node design-review/shoot.mjs` → zero overflow, zero spill, zero mobile small-target and
   zero console-error findings in `after/report.json`.
4. `npx --no-install impeccable detect src` → zero unjustified findings.
5. `npm run check` clean, `npm test` green, `npm run build` succeeds.
6. `./.beryl/scripts/check.sh` passes.
7. Work committed on this branch; `git status` clean apart from excluded paths.
8. A final report listing the exact UI decisions made, the before/after evidence, and the
   screenshot paths.
