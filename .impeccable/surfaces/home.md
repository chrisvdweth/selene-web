# Home: learner paths

## Purpose and composition

The home page leads independent learners into a complete guided path through the notebook corpus. The hero introduces choosing a path, running standalone notebooks, and tracking completion on the current device. The full path appears next: title, description, completion count, ordered stages, and linked lessons with difficulty or completion labels. A horizontal rule and generous spacing then introduce “Explore individual topics” and the existing topic browser.

## Interaction and responsive behavior

After hydration, a “Choose a path” dropdown selects one complete path at a time; the first path is selected initially. Its native details/summary trigger displays the current title. Each option shows its title and description, exposes its pressed state and associated section, and is reachable with Tab. Selecting an option closes the dropdown and returns focus to the trigger. Escape also closes it and returns focus; clicking outside dismisses it. A separate “Compare all paths” link leads to `/paths`, which continues to show every path together. Before hydration or without JavaScript, all paths remain readable and lesson links remain available, with no inactive picker controls.

The trigger and options have a minimum height of 48px. On desktop the options overlay the path content; at 700px and below they remain in document flow, placing the comparison link and content below the open dropdown. The options scroll within a maximum height of the smaller of 24rem and 60vh, accommodating a growing path catalog without a row of wrapping tabs. Path stages pair their introduction with a lesson list on desktop; at 700px and below the header and stage content stack. The topic browser retains its existing responsive layout. Completion uses the existing device progress store and updates when progress changes.

## Existing visual inheritance

This surface preserves the Lunar Lab visual system and self-hosted typography: Space Grotesk headings, Inter interface text, and IBM Plex Mono data labels. Cards inherit `--surface`, `--rule`, and `--r-card`; picker controls inherit `--r-control`, `--rule-strong`, `--ink`, and the global focus treatment. The selected option uses an `--inset` background and `--blue-ink` title; hover also uses `--inset`, descriptions use `--muted`, and completed stages use the existing mint tint. Spacing uses the existing scale; the topic-browser divider uses `--rule`, with `--s12` above and `--s10` below. These tokens retain their existing light/dark behavior; this change establishes no new global visual rules.

## Review disposition

Ship, per the dropdown implementation and desktop/mobile visual review. Review captures: [desktop dropdown](../review/dropdown-desktop.png) and [mobile dropdown](../review/dropdown-mobile.png). The captures show the current three-path catalog; the larger-catalog capacity is supported by the bounded scrolling layout rather than a ten-path visual fixture.
