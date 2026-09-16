# Initial Build Hierarchy

## Build Contract

- Scope: Convert SELENE from a design prototype into a production-ready, static AI-learning application deployed on Cloudflare Pages. The app consumes a reviewed, pinned snapshot of `chrisvdweth/selene` notebooks; it provides rendered reading pages, standalone downloads, and working Colab actions.
- Non-goals: User accounts, server-side notebook execution, in-browser notebook editing, and automatic unreviewed deployment of upstream content.
- Ratified on: 2026-09-16
- Last updated: 2026-09-16
- Completion rule: every node and required check passes, durable context is promoted.

## Nodes

### N1 — Production contract and boundaries
- Parent: root
- Dependencies: none
- Deliverable: Durable product, architecture, vocabulary, security, and test contracts for the production application.
- Acceptance checks:
  - `./.beryl/scripts/check-md.sh`
  - Documentation has no prototype placeholders or stale fixture-set claims.
- Status: complete
- Canonical context targets:
  - `.beryl/agent/project-brief.md`
  - `.beryl/agent/architecture.md`
  - `.beryl/agent/ubiquitous-language.md`
  - `.beryl/agent/security-policy.md`
  - `.beryl/agent/testing-policy.md`
- Evidence: Production contract and ADR added; Markdown checks pending final gate.

### N2 — Pinned notebook synchronization
- Parent: root
- Dependencies: N1
- Deliverable: A fetch, provenance, rendering, and validation pipeline for the upstream notebook repository.
- Acceptance checks:
  - `npm run notebooks:fetch`
  - `npm run notebooks:render`
  - `npm run notebooks:verify`
  - `npm test -- notebook-sync`
- Status: pending
- Canonical context targets:
  - `.beryl/agent/architecture.md`
  - `.beryl/agent/security-policy.md`
  - `.beryl/agent/ubiquitous-language.md`
- Evidence: Pending N1.

### N3 — Catalog and notebook actions
- Parent: root
- Dependencies: N2
- Deliverable: A validated, single-source catalog and correct upstream source, standalone download, and Colab actions.
- Acceptance checks:
  - `npm run validate:content`
  - `npm run test:links`
  - `npm test -- topics notebook-links`
- Status: pending
- Canonical context targets:
  - `.beryl/agent/architecture.md`
  - `.beryl/agent/ubiquitous-language.md`
- Evidence: Pending N2.

### N4 — Cloudflare Pages release surface
- Parent: root
- Dependencies: N2, N3
- Deliverable: Production URL validation, sitemap, headers, redirects, CI, scheduled content sync, and Pages deployment configuration.
- Acceptance checks:
  - `npm run build`
  - `npm run verify:release`
  - Generated `dist` contains sitemap, headers, redirects, and no placeholder origin.
- Status: pending
- Canonical context targets:
  - `.beryl/agent/architecture.md`
  - `.beryl/agent/security-policy.md`
  - `.beryl/agent/testing-policy.md`
- Evidence: Pending N2 and N3.

### N5 — Resilience, accessibility, and performance gates
- Parent: root
- Dependencies: N3, N4
- Deliverable: Responsive loading states, automated content/link/accessibility coverage, performance budgets, and release observability guidance.
- Acceptance checks:
  - `npm run check`
  - `npm test`
  - `npm run build`
  - `npm run verify:release`
- Status: pending
- Canonical context targets:
  - `.beryl/agent/design-tree.md`
  - `.beryl/agent/testing-policy.md`
- Evidence: Pending N3 and N4.

### N6 — Operator documentation and legal attribution
- Parent: root
- Dependencies: N1, N2, N3, N4, N5
- Deliverable: Production README, runbook, corrected package/legal notices, and regenerated agent shims.
- Acceptance checks:
  - `./.beryl/scripts/check-md.sh`
  - `./.beryl/agent/scripts/agent-doctor.sh`
  - `npm run verify:release`
- Status: pending
- Canonical context targets:
  - `.beryl/agent/README.md`
  - `.beryl/agent/tool-instruction-template.md`
- Evidence: Pending prior nodes.
