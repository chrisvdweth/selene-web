---
name: SELENE Lunar Lab
description: A calm, runnable atlas for open AI learning.
colors:
  canvas: "#f6f7fb"
  surface: "#ffffff"
  ink: "#151925"
  muted: "#647086"
  rule: "#dce1ea"
  lunar-blue: "#315bff"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.08
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  control: "8px"
  card: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.lunar-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 16px"
---

# Design System: SELENE Lunar Lab

## Overview

**Creative North Star: "The Prepared Experiment"**

SELENE should feel like opening a well-prepared notebook: calm, precise, and ready to run. Information hierarchy and explicit next actions take precedence over decoration.

## Colors

Use the blue accent sparingly for primary action and focus. Category color always appears with written category text.

## Typography

Space Grotesk carries displays, Inter carries reading, and IBM Plex Mono identifies data, IDs, and notebook metadata. Body copy is kept to a readable measure.

## Layout

The shell is fluid to 1240px. Mobile layouts prioritize the active topic and its primary action; controls maintain 44px targets.

## Elevation & Depth

Depth comes primarily from tonal surfaces and thin rules. Shadows are restrained and structural.

## Shapes

Use 12px cards, 8px controls, and thin borders. Avoid decorative gradients.

## Components

Primary actions are compact, explicit, keyboard-visible controls. Notebook actions must state whether they read, download, or launch the material.

## Do's and Don'ts

### Do:

- **Do** preserve a direct, visible path to the next learning action.
- **Do** expose unavailable content states honestly.

### Don't:

- **Don't** use color as the only category signal.
- **Don't** make the map the only representation of prerequisites.
