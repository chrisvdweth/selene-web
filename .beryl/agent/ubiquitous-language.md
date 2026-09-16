# SELENE Ubiquitous Language

- **Original notebook**: a notebook directly under upstream `notebooks/`; it is the source used for catalogue discovery and the rendered reading artifact.
- **Standalone notebook**: an upstream notebook under `notebooks/standalone/` with its runtime dependencies included; it is the only artifact offered for local download and Colab.
- **Snapshot**: one immutable upstream Git commit and the downloaded original notebooks associated with it.
- **Provenance manifest**: generated committed record of the snapshot SHA, file digests, discovery data, and original-to-standalone mappings.
- **Rendered artifact**: sanitized static HTML generated from an original notebook and committed under `public/notebooks/`.
- **Topic**: a stable catalogue record with curated metadata and exactly one original notebook mapping.
- **Prerequisite edge**: a directed edge from a completed topic to a newly available topic. All edges form a DAG.
- **Learning path**: a visualized sequence derived from prerequisite edges; it is guidance, not a claim that learning is linear.
- **Unavailable runtime action**: an explicit state shown when the upstream source has no validated standalone notebook; it must not be represented as a working download or Colab link.
- **Release artifact**: the fully verified static `dist/` directory deployed by Cloudflare Pages.
