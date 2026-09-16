# SELENE Security Policy

## Trust Model

The browser receives static HTML only. GitHub notebook content is untrusted until it has been fetched into a pinned snapshot, validated, rendered with escaping/sanitization, reviewed in a pull request, and deployed as a static artifact.

## Required Controls

1. Production builds consume committed provenance and rendered artifacts; only the scheduled sync contacts upstream.
2. Fetches resolve a commit SHA before downloading, enforce repository/path allowlists, write atomically, hash every source notebook, and preserve the prior snapshot on failure.
3. The renderer never executes notebook code and escapes all source-derived text; any future rich HTML support requires a tested sanitizer allowlist.
4. Cloudflare Pages headers enforce HTTPS, content-type sniffing protection, a restrictive referrer policy, frame restrictions, permissions policy, and a Content Security Policy.
5. Credentials are stored only as GitHub/Cloudflare secrets. No tokens, secrets, or private URLs may appear in generated artifacts, commits, logs, prompts, or client code.
6. GitHub Actions use least-privilege permissions and immutable action references where practical. Dependency, secret, and license scans run in CI.

## Incident Response

- **Bad upstream content**: revert the synchronization PR or roll back the Pages deployment; do not refetch until reviewed.
- **Broken source or standalone action**: hide the action through the committed mapping and open an upstream issue.
- **Credential exposure**: revoke it immediately, rotate the secret, inspect workflow logs, and invalidate affected deployments.
- **Header/CSP regression**: stop promotion, restore the prior static artifact, and add a release verification case.

## Access Defaults

- Read-only external access by default.
- Human approval is required for production writes, credential changes, destructive operations, dependency upgrades, and changing the trusted upstream repository.
