# Home: learner paths

## Purpose and composition

The home page leads independent learners into a complete guided path through the notebook corpus. The hero introduces choosing a path, running standalone notebooks, and tracking completion on the current device. The full path appears next: title, description, completion count, ordered stages, and linked lessons with difficulty or completion labels. A horizontal rule and generous spacing then introduce “Explore individual topics” and the existing topic browser.

## Interaction and responsive behavior

After hydration, a persistent “Learner paths” selector displays the catalog count and selects one complete path at a time; the first path is selected initially. Each button shows its title and completion count, exposes its selected state with `aria-pressed`, and associates itself with the matching section using `aria-controls`. Buttons are reachable with Tab and activate with Enter or Space; focus stays on the selected button. The homepage has no compare-path link or `/paths` navigation. Before hydration or without JavaScript, all paths remain readable and lesson links remain available, with no inactive selector controls.

Selector buttons have a minimum height of 64px. Above 700px the selector occupies a sidebar beside the path content and sticks 84px below the viewport top while scrolling through the path. Its list scrolls within `calc(100dvh - 180px)` with contained overscroll. The sidebar is 260px wide, narrowing to 220px at 900px. At 700px and below it sits above the content in normal flow, with the list capped at 16rem. This bounded list accommodates a growing catalog without wrapping tabs or a dropdown. Path stages pair their introduction with a lesson list on desktop; at 900px and below stage content stacks, and at 700px and below the header also stacks. The topic browser retains its existing responsive layout. Completion uses the existing device progress store and updates when progress changes.

## Existing visual inheritance

This surface preserves the Lunar Lab visual system and self-hosted typography: Space Grotesk headings, Inter interface text, and IBM Plex Mono data labels. The shared path container inherits `--surface`, `--rule`, and `--r-card`; its sidebar uses `--inset`. Selector buttons inherit `--r-control`, `--ink`, and the global focus treatment. The selected button has an `--ink` border and `--surface` background; hover also uses `--surface`. Completion labels and descriptions use `--muted`, and completed stages use the existing mint tint. Spacing uses the existing scale; the topic-browser divider uses `--rule`, with `--s12` above and `--s10` below. These tokens retain their existing light/dark behavior; this change establishes no new global visual rules.

## Review disposition

Ship, per the sidebar implementation and desktop, mobile, tablet, and dark-theme visual review. Review captures: [desktop sidebar](../review/sidebar-desktop.png), [mobile sidebar](../review/sidebar-mobile.png), [tablet sidebar](../review/sidebar-tablet.png), and [dark sidebar](../review/sidebar-dark.png). The captures show the current three-path catalog. Implementation verification reports successful type checking and build, all path selections, Enter activation, overflow checks at three viewport widths, synthetic ten-row capacity, and the no-JavaScript fallback, with no page errors. The synthetic capacity check verifies the bounded layout; it does not establish future path content or ten distinct real paths. No approved visual comp was supplied; review uses the incumbent Lunar Lab interface as its visual authority.
