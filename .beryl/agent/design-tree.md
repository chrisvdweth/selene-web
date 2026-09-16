# SELENE Design Tree

## Current Design Concept

SELENE is a calm, static-first learning atlas. The catalogue and local dependency workbench help learners decide what to study next; the notebook page makes the three actions unambiguous: read the rendered material, download a standalone notebook, or run that standalone notebook in Colab.

## Production States

- A topic without a validated standalone source shows the rendered material and source reference, plus a clear unavailable-runtime explanation. It never shows a broken action.
- A topic without prerequisite edges remains useful through its description, category, and nearby content.
- Notebook iframes load lazily and retain a visible direct-reading fallback.
- Search, navigation, and topic links remain usable before React hydration.

## Settled Decisions

| Decision | Choice | Date | ADR |
| --- | --- | --- | --- |
| Content release model | Review a pinned upstream snapshot in a pull request before a static deployment. | 2026-09-16 | 0002 |
| Runnable notebook action | Use upstream standalone files for both direct download and Colab. | 2026-09-16 | 0002 |
| Hosting | Cloudflare Pages static deployment; stateful features require a separate future API design. | 2026-09-16 | n/a |
| Typography | Self-hosted Space Grotesk, Inter, and IBM Plex Mono with `font-display: swap`. | 2026-08-23 | n/a |

## Quality Floor

- Keyboard-visible focus, labelled controls, text equivalents for diagrams, reduced-motion support, and 44px touch targets.
- Responsive checks at 320px, 375px, 768px, and desktop; 200% text zoom must not hide primary actions.
- Core Web Vitals are measured separately for mobile and desktop before release.
