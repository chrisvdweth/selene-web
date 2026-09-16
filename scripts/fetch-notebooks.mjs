import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const config = JSON.parse(await readFile("src/data/notebook-source.json", "utf8"));
const args = new Set(process.argv.slice(2));
const refIndex = process.argv.indexOf("--ref");
const ref = refIndex >= 0 ? process.argv[refIndex + 1] : config.branch;
if (refIndex >= 0 && !ref) throw new Error("--ref requires a value");
const repo = `${config.owner}/${config.repository}`;
const headers = { Accept: "application/vnd.github+json", "User-Agent": "selene-web-content-sync", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const getJson = async (url) => { const response = await fetch(url, { headers }); if (!response.ok) throw new Error(`${url} returned ${response.status}`); return response.json(); };
const commit = (await getJson(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`)).sha;
if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error("GitHub returned an invalid commit SHA");
const tree = await getJson(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`);
if (tree.truncated) throw new Error("Upstream tree is truncated");
const originals = tree.tree.filter((x) => new RegExp(`^${config.notebooksPath}/[^/]+\\.ipynb$`).test(x.path)).map((x) => x.path.slice(config.notebooksPath.length + 1)).sort();
const standalones = tree.tree.filter((x) => new RegExp(`^${config.standalonePath}/[^/]+\\.ipynb$`).test(x.path)).map((x) => x.path.slice(config.standalonePath.length + 1));
if (!originals.length) throw new Error("No original notebooks found");
const standaloneSet = new Set(standalones);
const entries = originals.map((notebook) => {
  const base = notebook.replace(/\.ipynb$/, "");
  const exact = `${base}_standalone.ipynb`;
  const alternatives = standalones.filter((name) => name.startsWith(`${base}_`) && name.endsWith("_standalone.ipynb"));
  return { notebook, standalone: standaloneSet.has(exact) ? exact : alternatives.length === 1 ? alternatives[0] : null };
});
if (args.has("--check")) { console.log(`Validated ${entries.length} originals at ${commit}.`); process.exit(0); }
const cacheRoot = resolve(".cache/notebooks");
const temporary = resolve(cacheRoot, `.incoming-${commit}`);
const target = resolve(cacheRoot, commit);
await rm(temporary, { recursive: true, force: true });
await mkdir(temporary, { recursive: true });
const downloaded = await Promise.all(entries.map(async (entry) => {
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${config.notebooksPath}/${encodeURIComponent(entry.notebook)}`, { headers });
  if (!response.ok) throw new Error(`Could not download ${entry.notebook}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024) throw new Error(`${entry.notebook} exceeds the 25MB source limit`);
  await writeFile(resolve(temporary, entry.notebook), bytes, { flag: "wx" });
  return { ...entry, sha256: createHash("sha256").update(bytes).digest("hex") };
}));
await rm(target, { recursive: true, force: true });
await rename(temporary, target);
await writeFile(resolve(cacheRoot, "current.json"), JSON.stringify({ source: target, commit, fetchedAt: new Date().toISOString(), entries: downloaded }, null, 2) + "\n");
await writeFile("src/data/notebook-provenance.json", JSON.stringify({ repository: repo, branch: config.branch, commit, entries: downloaded }, null, 2) + "\n");
console.log(`Fetched ${downloaded.length} notebooks at ${commit}.`);
