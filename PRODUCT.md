# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Independent learners studying AI and maintainers who curate its notebook corpus and prerequisite paths.

## Product Purpose

SELENE makes a large open notebook corpus navigable, readable, and runnable. Success is a learner finding a suitable topic, understanding its dependencies, then opening a verified standalone notebook locally or in Colab.

## Positioning

SELENE combines an accessible topic catalogue and learning-path view with the upstream SELENE notebooks; it does not execute code or conceal the source material behind an account.

## Operating Context

Learners use mobile and desktop browsers. Maintainers update reviewed upstream snapshots and curated paths through Git pull requests. Cloudflare Pages serves immutable static releases.

## Capabilities and Constraints

- Original notebooks come from `chrisvdweth/selene` at a recorded commit.
- Standalone notebooks are the only downloads and Colab launch targets.
- Production builds have no live GitHub dependency.
- The final custom production URL remains to be configured through `SITE_URL`.

## Brand Commitments

SELENE Lunar Lab is direct, precise, calm, and encouraging. Preserve its self-hosted typography, light/dark support, and measured learning-tool character.

## Product Principles

- Never offer a learner a link known to be broken.
- Prefer reproducible, reviewed content over fresh but mutable content.
- Keep the core learning workflow useful without JavaScript.
- Meet accessible, fast mobile and desktop expectations before adding features.

## Accessibility & Inclusion

Meet WCAG 2.2 AA for core workflows, support keyboard navigation and reduced motion, and test 200% text zoom and narrow mobile layouts.
