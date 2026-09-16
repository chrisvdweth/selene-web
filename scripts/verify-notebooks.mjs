import { access, readFile } from "node:fs/promises";

const provenance = JSON.parse(await readFile("src/data/notebook-provenance.json", "utf8"));
const topics = JSON.parse(await readFile("src/data/generated-topics.json", "utf8"));
if (!/^[a-f0-9]{40}$/i.test(provenance.commit || "")) throw new Error("Notebook provenance must contain an immutable commit SHA");
if (!Array.isArray(provenance.entries) || provenance.entries.length === 0) throw new Error("Notebook provenance has no entries");
if (topics.length !== provenance.entries.length) throw new Error("Generated topic and provenance counts differ");
for (const entry of provenance.entries) await access(`public/notebooks/${entry.notebook.replace(/\.ipynb$/, ".html")}`);
console.log(`Verified ${topics.length} rendered notebooks at ${provenance.commit}.`);
