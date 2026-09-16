# SELENE Testing Policy

Production changes run these commands in order:

```bash
npm run check
npm test
npm run validate:content
npm run test:links
npm run build
npm run verify:release
./.beryl/scripts/check.sh
```

## Required Coverage

| Layer | Required proof |
| --- | --- |
| Unit | Topic schema, CSV parsing, prerequisite DAG, URL builder, standalone mapping, and provenance validation. |
| Integration | Mocked GitHub snapshot fetch, checksum mismatch, renamed/deleted upstream files, atomic cache replacement, and renderer output. |
| Static release | Every topic has a rendered HTML artifact; all source/download/Colab links are valid; sitemap, robots, canonicals, headers, redirects, and 404 page are present. |
| Browser | Playwright desktop/mobile smoke tests, keyboard navigation, no horizontal overflow, and axe accessibility checks. |
| Performance | Bundle-size budget and Lighthouse runs for the home, catalogue, topic, and graph pages under a mobile profile. |

## Rules

- Never weaken tests to pass an implementation.
- Test generated output, not source alone.
- Mock network, time, and GitHub API responses in unit/integration tests.
- Update `tests/.manifest.sha256` with `.beryl/scripts/update-test-manifest.sh` after intentional test changes.
- A failed scheduled content sync is a failed release signal, not permission to publish partial content.
