import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, basename, extname } from "node:path";
import { createHash } from "node:crypto";
import katex from "katex";

const current = JSON.parse(await readFile(".cache/notebooks/current.json", "utf8").catch(() => "null"));
const provenance = JSON.parse(await readFile("src/data/notebook-provenance.json", "utf8"));
const source = process.env.SELENE_NOTEBOOK_SOURCE || current?.source;
if (!source) throw new Error("No notebook snapshot is available. Run npm run notebooks:fetch first.");

async function notebooks(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? notebooks(resolve(directory, entry.name), `${prefix}${entry.name}/`)
    : entry.name.endsWith(".ipynb") && !`${prefix}${entry.name}`.includes("standalone/") ? [`${prefix}${entry.name}`] : []))).flat().sort();
}

const fixtures = await notebooks(source);
const output = resolve("public/notebooks");
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "assets"), { recursive: true });

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const escapeAttribute = (value) => escapeHtml(value).replaceAll('"', "&quot;");
const cellText = (cell) => Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
const titleOf = (file) => basename(file, ".ipynb").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const slugOf = (file) => basename(file, ".ipynb").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
const decode = (value) => String(value).replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal))).replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
const plain = (value) => decode(String(value).replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[[^\]]+\]\([^)]*\)/g, " ").replace(/[#*_`]/g, "")).replace(/\s+/g, " ").trim();
const substantive = (value) => { const text = plain(value); return text.length > 40 && !/^(disclaimer|copyright|license|selene\b)/i.test(text) && !/\b(disclaimer|all rights reserved)\b/i.test(text); };
const trim = (value, limit) => value.length <= limit ? value : `${value.slice(0, limit).replace(/\s+\S*$/, "").replace(/[\s,;:.!?-]+$/, "")}…`;
const boilerplate = (value) => /^(disclaimer|copyright|licen[cs]e)\b/i.test(value) || /\b(all rights reserved|content generated with the assistance of ai)\b/i.test(value);

const faces = (await readFile("src/styles/fonts/fonts.css", "utf8")).replaceAll('url("./', 'url("/notebooks/fonts/');
const katexCss = (await readFile("node_modules/katex/dist/katex.min.css", "utf8")).replaceAll("url(fonts/", "url(/notebooks/katex/fonts/");
await mkdir(resolve(output, "fonts"), { recursive: true });
await mkdir(resolve(output, "katex/fonts"), { recursive: true });
await Promise.all((await readdir("src/styles/fonts")).filter((name) => name.endsWith(".woff2")).map((name) => copyFile(resolve("src/styles/fonts", name), resolve(output, "fonts", name))));
await Promise.all((await readdir("node_modules/katex/dist/fonts")).filter((name) => name.endsWith(".woff2")).map((name) => copyFile(resolve("node_modules/katex/dist/fonts", name), resolve(output, "katex/fonts", name))));

const sheet = `${faces}\n${katexCss}
:root{--canvas:#fff;--inset:#f1f3f9;--ink:#151925;--muted:#647086;--rule:#dce1ea;color-scheme:light}@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--canvas:#141a2e;--inset:#0c1020;--ink:#f4f6fc;--muted:#a7b1c7;--rule:#2b3652;color-scheme:dark}}:root[data-theme=dark]{--canvas:#141a2e;--inset:#0c1020;--ink:#f4f6fc;--muted:#a7b1c7;color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font:400 1rem/1.65 Inter,system-ui,sans-serif;-webkit-text-size-adjust:100%}.doc{max-width:44rem;margin:0 auto;padding:2rem 1.25rem 3.5rem}h1{font:600 1.75rem/1.2 'Space Grotesk',Inter,sans-serif}h2{margin:2.25rem 0 .5rem;font:600 1.125rem/1.3 'Space Grotesk',Inter,sans-serif}p{margin:0 0 .875rem}.fine{padding-top:.75rem;border-top:1px solid var(--rule);font-size:.8125rem;color:var(--muted)}.cell{margin:1.75rem 0;padding-top:1.5rem;border-top:1px solid var(--rule)}pre{margin:0;padding:.875rem 1rem;overflow:auto;white-space:pre-wrap;background:var(--inset);border:1px solid var(--rule);border-radius:8px;font:500 .8125rem/1.6 'IBM Plex Mono',monospace}.cell-label{margin:1rem 0 .375rem;font:500 .75rem/1 'IBM Plex Mono',monospace;text-transform:uppercase;color:var(--muted)}.output{background:transparent;color:var(--muted)}img{display:block;max-width:100%;height:auto;margin:1rem auto}.rich-output{display:block;width:100%;min-height:18rem;border:1px solid var(--rule);border-radius:8px;background:white}.katex-display{overflow:auto hidden}`;
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · SELENE</title><style>${sheet}</style></head><body><main class="doc"><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;

const upstreamAsset = new Map();
async function imageSource(sourcePath, alt = "") {
  if (/^data:image\//i.test(sourcePath) || /^https:\/\//i.test(sourcePath)) return `<img src="${escapeAttribute(sourcePath)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
  const clean = sourcePath.replace(/^\.\//, "").replace(/^\//, "");
  if (!clean.startsWith("images/")) return `<span>${escapeHtml(alt || sourcePath)}</span>`;
  if (!upstreamAsset.has(clean)) {
    const extension = extname(clean).replace(/[^.a-z0-9]/gi, "") || ".bin";
    const name = `${createHash("sha256").update(clean).digest("hex")}${extension}`;
    const url = `https://raw.githubusercontent.com/${provenance.repository}/${provenance.commit}/${clean.split("/").map(encodeURIComponent).join("/")}`;
    upstreamAsset.set(clean, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      await writeFile(resolve(output, "assets", name), Buffer.from(await response.arrayBuffer()));
      return `/notebooks/assets/${name}`;
    }).catch(() => null));
  }
  const local = await upstreamAsset.get(clean);
  return local ? `<img src="${local}" alt="${escapeAttribute(alt)}" loading="lazy">` : `<span>${escapeHtml(alt || clean)}</span>`;
}

function math(value) {
  const render = (tex, displayMode) => katex.renderToString(decode(tex), { displayMode, throwOnError: false, strict: "ignore", trust: false });
  return escapeHtml(value).replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => render(tex, true)).replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => render(tex, true)).replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => render(tex, false)).replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, before, tex) => `${before}${render(tex, false)}`);
}

async function markdown(source) {
  const imageTokens = [];
  const working = source.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (_, url) => `@@IMAGE${imageTokens.push({ url, alt: "" }) - 1}@@`).replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => `@@IMAGE${imageTokens.push({ url, alt }) - 1}@@`);
  const images = await Promise.all(imageTokens.map((image) => imageSource(image.url, image.alt)));
  return working.split(/\n{2,}/).map((block) => {
    const text = plain(block);
    if (!text && !/@@IMAGE/.test(block)) return "";
    const content = math(text).replace(/@@IMAGE(\d+)@@/g, (_, index) => images[Number(index)] ?? "");
    if (block.trimStart().startsWith("#")) return `<h2>${content}</h2>`;
    return boilerplate(text) ? `<p class="fine">${content}</p>` : `<p>${content}</p>`;
  }).join("");
}

function outputHtml(output) {
  const data = output.data ?? {};
  const text = (value) => Array.isArray(value) ? value.join("") : String(value ?? "");
  if (data["image/png"]) return `<img src="data:image/png;base64,${text(data["image/png"])}" alt="Notebook output">`;
  if (data["image/jpeg"]) return `<img src="data:image/jpeg;base64,${text(data["image/jpeg"])}" alt="Notebook output">`;
  if (data["image/svg+xml"]) return `<img src="data:image/svg+xml,${encodeURIComponent(text(data["image/svg+xml"]))}" alt="Notebook output">`;
  if (data["text/html"]) return `<iframe class="rich-output" sandbox="allow-scripts" srcdoc="${escapeAttribute(text(data["text/html"]))}" title="Notebook rich output"></iframe>`;
  if (output.output_type === "error") return `<pre class="output">${escapeHtml(text(output.traceback))}</pre>`;
  const value = output.text ?? data["text/plain"];
  return value ? `<pre class="output">${escapeHtml(text(value))}</pre>` : "";
}

const manifest = [];
for (const file of fixtures) {
  const notebook = JSON.parse(await readFile(resolve(source, file), "utf8"));
  const cells = notebook.cells ?? [];
  const first = cells.find((cell) => cell.cell_type === "markdown" && substantive(cellText(cell)));
  const title = titleOf(file);
  const intro = first ? trim(plain(cellText(first)), 220) : `A hands-on SELENE notebook about ${title.toLowerCase()}.`;
  const name = file.toLowerCase();
  const category = /llm|token|word|text|language|transformer|attention|rag|pos|stemming/.test(name) ? "Language AI" : /neural|backprop|optimizer|dropout|rnn|mlp/.test(name) ? "Deep Learning" : "Foundations";
  const difficulty = /overview|basics|introduction/.test(name) ? "Beginner" : /implementation|from_scratch|advanced/.test(name) ? "Advanced" : "Intermediate";
  const body = (await Promise.all(cells.map(async (cell) => {
    if (cell.cell_type === "markdown") return markdown(cellText(cell));
    if (cell.cell_type !== "code") return "";
    const outputs = (cell.outputs ?? []).map(outputHtml).join("");
    return `<section class="cell code"><pre><code>${escapeHtml(cellText(cell))}</code></pre>${outputs ? `<p class="cell-label">Output</p>${outputs}` : ""}</section>`;
  }))).join("\n");
  await writeFile(resolve(output, file.replace(".ipynb", ".html")), page(title, body).replace(/[ \t]+$/gm, ""));
  manifest.push({ id: slugOf(file), title, category, subtopic: category === "Language AI" ? "Language systems" : category === "Deep Learning" ? "Neural systems" : "Machine learning", difficulty, intro, notebook: file, prerequisites: [] });
}
await writeFile("src/data/generated-topics.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Rendered ${manifest.length} notebooks and ${upstreamAsset.size} source images.`);
