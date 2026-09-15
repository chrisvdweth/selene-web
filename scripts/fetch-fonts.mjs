/**
 * Vendors the three OFL faces SELENE uses into src/styles/fonts/ as woff2, and
 * writes the @font-face sheet that points at them.
 *
 * Why this exists: the faces used to arrive through
 * `@import url("https://fonts.googleapis.com/css2?...")` inside global.css. A CSS
 * @import of a third-party sheet is render-blocking and serialises two round
 * trips (googleapis for the sheet, gstatic for the files) before a single
 * character paints — on a site that otherwise makes no external request at all,
 * and while handing every visitor's IP to a third party. Self-hosting removes
 * both problems: the faces are same-origin, cacheable with the rest of the
 * build, and requested in parallel with the page's own stylesheet.
 *
 * Inter, Space Grotesk and IBM Plex Mono are all SIL Open Font License 1.1, so
 * redistribution inside this repository is permitted. See src/styles/fonts/OFL.txt.
 *
 * Run this only when the face list below changes:
 *   node scripts/fetch-fonts.mjs
 * The output is committed, so a normal build and a normal checkout never touch
 * the network.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

/* Exactly the families and weights the stylesheets ask for — nothing else.
   Every weight here is referenced by src/styles/global.css or by the notebook
   renderer's inline sheet; adding a weight means adding a file, so the list is
   deliberately short.

   Inter is asked for as a `wght@400..600` range rather than as three separate
   weights. Google serves Inter as a variable font, so three named weights
   return the same bytes three times — 141KB of duplicate payload for the latin
   slice alone. One range request is one file, and `font-weight: 400 600` on the
   face lets the browser instance 400, 500 and 600 out of it. */
const FAMILIES = [
  { name: "Inter", slug: "inter", weights: [400, 600], range: true },
  { name: "Space Grotesk", slug: "space-grotesk", weights: [600] },
  { name: "IBM Plex Mono", slug: "ibm-plex-mono", weights: [500] },
];

/* The site is English. `latin` carries the interface and the notebooks; the
   `latin-ext` slice is kept because technical prose reaches for names like
   Kullback–Leibler and Fréchet, and one glyph falling back mid-word to a
   different face is more visible than the file costs. Because each face is
   gated by `unicode-range`, a visitor who never meets an extended glyph never
   downloads it — the slice is weight in the repository, not on the wire.
   Cyrillic, Greek and Vietnamese slices are dropped outright. */
const SUBSETS = new Set(["latin", "latin-ext"]);

/* Google's css2 endpoint serves woff2 only to UAs it recognises; the default
   Node fetch UA gets ttf. */
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const outDir = resolve("src/styles/fonts");
await mkdir(outDir, { recursive: true });
/* Rerunning after a change to FAMILIES must not leave orphaned faces behind. */
for (const name of await readdir(outDir)) {
  if (name.endsWith(".woff2")) await rm(resolve(outDir, name));
}

const faces = [];

for (const family of FAMILIES) {
  const wght = family.range ? family.weights.join("..") : family.weights.join(";");
  const url =
    "https://fonts.googleapis.com/css2?family=" +
    family.name.replaceAll(" ", "+") +
    ":wght@" +
    wght +
    "&display=swap";
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${family.name}: ${response.status} ${response.statusText}`);
  const sheet = await response.text();

  /* Each block in the response is preceded by a `/* subset *\/` comment. */
  const blocks = sheet.split("/*").slice(1);
  const seen = new Map();
  for (const block of blocks) {
    const subset = block.slice(0, block.indexOf("*/")).trim();
    if (!SUBSETS.has(subset)) continue;
    const weight = /font-weight:\s*([\d\s]+);/.exec(block)?.[1]?.trim();
    const src = /src:\s*url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    if (!weight || !src || !range) continue;

    const bytes = await fetch(src, { headers: { "User-Agent": UA } });
    if (!bytes.ok) throw new Error(`${family.slug} ${subset}: ${bytes.status}`);
    const buffer = Buffer.from(await bytes.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");

    /* Belt and braces: if the endpoint still hands back the same bytes for two
       declarations, write them once. */
    if (seen.has(hash)) {
      console.log(`${family.slug} ${subset} ${weight} -> reuses ${seen.get(hash)}`);
      continue;
    }
    const file = `${family.slug}-${subset}-${family.weights.join("-")}.woff2`;
    seen.set(hash, file);
    await writeFile(resolve(outDir, file), buffer);
    faces.push({ family: family.name, weight, file, range, subset, size: buffer.length });
    console.log(`${file}  ${(buffer.length / 1024).toFixed(1)}KB  weight ${weight}`);
  }
}

/* Sort so the generated sheet is stable across runs and diffs stay readable. */
faces.sort(
  (a, b) =>
    a.family.localeCompare(b.family) ||
    String(a.weight).localeCompare(String(b.weight)) ||
    a.subset.localeCompare(b.subset),
);

const sheet = `/* Generated by scripts/fetch-fonts.mjs — do not edit by hand.
   Self-hosted so no visitor request leaves this origin for a font. Every face
   is font-display: swap, so text paints in the fallback immediately and swaps
   once the face arrives; nothing here blocks the first paint.
   Inter, Space Grotesk, IBM Plex Mono — SIL OFL 1.1, see OFL.txt. */

${faces
  .map(
    (face) => `@font-face {
  font-family: "${face.family}";
  font-style: normal;
  font-weight: ${face.weight};
  font-display: swap;
  src: url("./${face.file}") format("woff2");
  unicode-range: ${face.range};
}`,
  )
  .join("\n\n")}
`;

await writeFile(resolve(outDir, "fonts.css"), sheet);
console.log(
  `\nWrote fonts.css with ${faces.length} faces, ${(
    faces.reduce((sum, f) => sum + f.size, 0) / 1024
  ).toFixed(1)}KB total.`,
);
