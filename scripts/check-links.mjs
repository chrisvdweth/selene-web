import { readFile } from "node:fs/promises";
const [source, provenance] = await Promise.all([readFile("src/data/notebook-source.json", "utf8").then(JSON.parse), readFile("src/data/notebook-provenance.json", "utf8").then(JSON.parse)]);
for (const entry of provenance.entries) {
  new URL(`https://github.com/${source.owner}/${source.repository}/blob/${source.branch}/${source.notebooksPath}/${entry.notebook}`);
  if (entry.standalone) new URL(`https://githubtocolab.com/${source.owner}/${source.repository}/blob/${source.branch}/${source.standalonePath}/${entry.standalone}`);
}
console.log(`Validated link construction for ${provenance.entries.length} notebooks.`);
