# Home: learner paths

## Purpose and composition

The home page leads independent learners into a complete guided path through the notebook corpus. The hero introduces choosing a path, running standalone notebooks, and tracking completion on the current device. The full path appears next: title, description, completion count, ordered stages, and linked lessons with difficulty or completion labels. A horizontal rule and generous spacing then introduce “Explore individual topics” and the existing topic browser.

## Interaction and responsive behavior

After hydration, three tabs select one complete path at a time; the first path is selected initially. The tabs expose selected state and associated panels, use a single tab stop, and support Left/Right arrows with wraparound plus Home/End. Selection follows keyboard focus; the active panel is focusable. Before hydration or without JavaScript, all three paths remain readable and lesson links remain available, with no inactive tab controls. The separate `/paths` page continues to show all paths together.

Tabs wrap with available width and have a minimum height of 48px. Path stages pair their introduction with a lesson list on desktop; at 700px and below the header and stage content stack. The topic browser retains its existing responsive layout. Completion uses the existing device progress store and updates when progress changes.

## Existing visual inheritance

This surface preserves the Lunar Lab visual system and self-hosted typography: Space Grotesk headings, Inter interface text, and IBM Plex Mono data labels. Cards inherit `--surface`, `--rule`, and `--r-card`; tab controls inherit `--r-control`, `--rule-strong`, `--ink`, and the global focus treatment. The selected tab uses `--blue-ink` with `--surface` text, hover uses `--inset`, and completed stages use the existing mint tint. Spacing uses the existing scale; the topic-browser divider uses `--rule`, with `--s12` above and `--s10` below. These tokens retain their existing light/dark behavior; this change establishes no new global visual rules.

## Review disposition

Ship, per the completed desktop and mobile visual review. Review captures: [desktop](../review/desktop.png) and [mobile](../review/mobile.png).
