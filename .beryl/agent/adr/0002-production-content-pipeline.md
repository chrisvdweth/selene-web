# ADR 0002: Review pinned notebook snapshots before publication

- Status: accepted
- Date: 2026-09-16

## Context

SELENE displays material from a mutable external notebook repository. Fetching `master` during each production build makes deployments non-reproducible and could publish partial or unexpected content.

## Decision

The synchronization workflow resolves `master` to a Git commit SHA, downloads and validates that snapshot, generates provenance and rendered artifacts, and proposes them through a pull request. Production builds use the committed artifacts and provenance only. Standalone files are mapped explicitly and only validated targets receive download and Colab actions.

## Consequences

- Content updates are reviewable and reversible.
- Scheduled synchronization needs GitHub API/network access, but production deployment does not.
- Missing or renamed upstream standalone files are visible validation failures instead of broken learner links.
