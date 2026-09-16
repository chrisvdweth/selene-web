# SELENE Production Brief

SELENE is a production, static-first learning application for independent AI learners. It turns the upstream [SELENE notebook corpus](https://github.com/chrisvdweth/selene/tree/master/notebooks) into an accessible catalogue of concepts, prerequisite paths, rendered reading material, standalone local downloads, and Google Colab launches.

The application is deployed on Cloudflare Pages. It has no accounts and no server-side notebook execution: learner progress and notebook execution stay outside the site. Maintainers review source and learning-path updates through Git pull requests.

## Product Goal

Help learners find a topic, understand what to study first, read it quickly on any device, and open a runnable standalone notebook without encountering stale or broken material.

## Primary Workflows

1. **Discover and choose**: search or browse the catalogue, inspect a topic and its prerequisites, and open the next learning artifact.
2. **Read and run**: read a safely rendered notebook, download its standalone version for local use, or launch that standalone version in Colab.
3. **Maintain content**: synchronize a reviewed upstream snapshot, curate topics and learning paths, and publish a reproducible static release.

## Non-Goals

- User accounts, saved progress, social features, or learner analytics that identify people.
- Executing arbitrary notebooks, code, or uploads on SELENE infrastructure.
- Automatically publishing unreviewed upstream content changes.

## External Systems

| System | Why it exists | Interface owner | Failure fallback |
| --- | --- | --- | --- |
| `chrisvdweth/selene` | Canonical notebook source and standalone runnable notebooks | Notebook source adapter | Preserve the last verified snapshot; fail the sync rather than publish partial content. |
| GitHub API/raw content | Resolve immutable upstream commits and retrieve notebook files | Notebook source adapter | Retry within bounded limits; require a token only in CI when unauthenticated limits are reached. |
| githubtocolab.com / Google Colab | Launch standalone notebooks in Colab | Notebook link builder | Hide the Colab action when validation finds no standalone target. |
| Cloudflare Pages | Static hosting, TLS, CDN, cache headers, previews | Release workflow | Keep the previous production deployment available for rollback. |

## Production Constraints

- Production builds must be reproducible from a committed provenance manifest; they must not fetch a mutable upstream branch.
- Every published topic needs a rendered artifact and validated source/download/Colab actions.
- The 75th percentile Core Web Vitals targets are LCP <= 2.5s, INP <= 200ms, and CLS <= 0.1, measured separately on mobile and desktop.
- All primary workflows must work with keyboard navigation, reduced motion, current mobile browsers, and current desktop browsers.

## Definition Of Done

A change is complete only when it has all of the following:

1. A documented owner, boundary, and failure behavior when it touches an external system.
2. Schema/behavior tests plus an edge case test.
3. Generated-output verification for static pages, assets, sitemap, robots, redirects, and headers affected by the change.
4. The relevant release, accessibility, link, and performance checks pass.
5. An ADR for durable changes to data ownership, sync, security, or deployment.
