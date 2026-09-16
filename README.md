# SELENE Web

SELENE is a static-first learning atlas for open AI education. It indexes the upstream [SELENE notebooks](https://github.com/chrisvdweth/selene/tree/master/notebooks), renders safe reading pages, visualizes curated prerequisite paths, and directs learners to runnable standalone downloads and Colab notebooks.

## Local development

```bash
npm ci
npm run notebooks:fetch
npm run notebooks:render
npm run dev
```

## Notebook synchronization

The only source is `https://github.com/chrisvdweth/selene/tree/master/notebooks`.

```bash
npm run notebooks:fetch                 # resolve master to a pinned SHA and download originals
npm run notebooks:fetch -- --ref master # fetch an explicit ref
npm run notebooks:fetch -- --check      # inspect upstream without writing
npm run notebooks:render                # refresh reading artifacts and discovery data
npm run notebooks:sync                  # fetch then render
```

`src/data/notebook-provenance.json` records the resolved commit, checksums, and original-to-standalone mapping. `.cache/notebooks/` is disposable; generated HTML is committed and reviewed. A failed fetch preserves the previous snapshot.

Downloads and Colab use upstream `notebooks/standalone`. Colab URLs follow:

```text
https://githubtocolab.com/chrisvdweth/selene/blob/master/notebooks/standalone/<standalone>.ipynb
```

Topics without a valid standalone counterpart show an unavailable state, never a broken link.

## Checks

```bash
npm run check
npm test
npm run validate:content
npm run test:links
npm run build
SITE_URL=https://your-domain.example npm run verify:release
./.beryl/scripts/check.sh
```

`topics.csv` owns curated metadata and `prerequisites.csv` is the sole source of learning-path edges. Do not hand-edit generated topics, provenance, or rendered notebooks.

## Cloudflare Pages

Connect this repository to Cloudflare Pages with build command `npm run build` and output directory `dist`. Set `SITE_URL` to the final HTTPS custom domain (or Pages URL). `_headers` provides security/cache headers and `_redirects` carries compatibility redirects. The weekly workflow opens a reviewable notebook-sync pull request.

## Operations and attribution

Deploy only after provenance, content, link, and generated-output checks pass. Roll back bad material by reverting its sync PR or selecting the prior Cloudflare Pages deployment. The app is Apache-2.0; upstream notebook code is MIT and text/figures are CC BY 4.0.
