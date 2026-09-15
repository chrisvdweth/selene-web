# Project Brief

SELENE Design is the shared Astro/React base for an open, self-paced AI learning atlas. Learners discover topics through an interactive visual graph, read concise topic context, and move into source Jupyter notebooks locally, as static HTML, or in Colab. Content is repository-owned CSV plus an external configurable notebook source; no backend is required for the base.

Primary users: independent learners and maintainers curating connected AI learning material. Success means a learner can find a topic, understand prerequisites, and open a usable learning artifact on mobile or desktop.

## Product Goal

Build **[application]** for **[primary users]** so they can **[core outcome]**.

## Primary Workflows

1. **[Workflow name]**: [user goal and success condition]
2. **[Workflow name]**: [user goal and success condition]
3. **[Workflow name]**: [user goal and success condition]

## Non-Goals

- [Explicitly out of scope now]
- [Explicitly out of scope now]

## External Systems

| System | Why it exists | Interface owner | Failure fallback |
| --- | --- | --- | --- |
| [Service/API/DB] | [Need] | [Context/adapter] | [Behavior on failure] |

## Definition Of Done

A feature is complete only when it has all of the following:

1. A small design artifact update (`design-tree.md` and/or ADR) when design changes.
2. Clear boundary types/interfaces (where language supports this).
3. Behavior tests plus at least one edge case test.
4. Deterministic checks run (`./.beryl/scripts/check.sh` and relevant project checks).
5. No new illegal boundary crossings.
