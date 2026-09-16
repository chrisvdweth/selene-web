import rows from "../data/topics.csv?raw";
import edgeRows from "../data/prerequisites.csv?raw";
import discovered from "../data/generated-topics.json";
import provenance from "../data/notebook-provenance.json";

export type Topic = {
  id: string;
  title: string;
  category: string;
  subtopic: string;
  difficulty: string;
  intro: string;
  notebook: string;
  standalone: string | null;
  prerequisites: string[];
};

/** Mark colours kept from the incumbent system for non-text swatches. */
export const COLORS: Record<string, string> = {
  Foundations: "#4f8cff",
  "Deep Learning": "#a855f7",
  "Language AI": "#e38a33",
};

/**
 * Category identity is expressed as a class so both themes can carry an
 * AA-contrast text colour. The written category name always accompanies it.
 */
export function categoryKey(category: string): string {
  const slug = category.toLowerCase().replace(/[^a-z]+/g, "-");
  return slug === "foundations" || slug === "deep-learning" || slug === "language-ai" ? slug : "foundations";
}

function csv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const parse = (line: string) => {
    const cells: string[] = []; let cell = ""; let quoted = false;
    for (let i = 0; i < line.length; i += 1) { const char = line[i]; if (char === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; } else if (char === "," && !quoted) { cells.push(cell); cell = ""; } else cell += char; }
    if (quoted) throw new Error("Unclosed CSV quote"); cells.push(cell); return cells;
  };
  const keys = parse(lines.shift() || "");
  return lines.filter(Boolean).map((line) => Object.fromEntries(keys.map((key, i) => [key, parse(line)[i] ?? ""])));
}

const curated = csv(rows) as any[];
const curatedByNotebook = new Map(curated.map((row) => [row.notebook, row]));
const edgeData = csv(edgeRows) as Array<{ source: string; target: string; relationship: string }>;
const prerequisites = new Map<string, string[]>();
for (const edge of edgeData) {
  if (edge.relationship !== "prerequisite") throw new Error(`Unsupported relationship: ${edge.relationship}`);
  prerequisites.set(edge.target, [...(prerequisites.get(edge.target) ?? []), edge.source]);
}
const provenanceByNotebook = new Map((provenance as { entries?: Array<{ notebook: string; standalone: string | null }> }).entries?.map((entry) => [entry.notebook, entry]) ?? []);

const declared: Topic[] = (discovered as any[]).map((found: any) => {
  const row = curatedByNotebook.get(found.notebook) || {};
  const source = provenanceByNotebook.get(found.notebook);
  if (!source) throw new Error(`Notebook provenance missing for ${found.notebook}`);
  const id = row.id || found.id;
  return { ...found, ...row, id, standalone: source.standalone, prerequisites: prerequisites.get(id) ?? [] };
});

if (new Set(declared.map((topic) => topic.id)).size !== declared.length) throw new Error("Topic IDs must be unique");
for (const edge of edgeData) if (!declared.some((topic) => topic.id === edge.source) || !declared.some((topic) => topic.id === edge.target) || edge.source === edge.target) throw new Error(`Invalid prerequisite edge ${edge.source} -> ${edge.target}`);

/**
 * Transitive reduction. A prerequisite that is already reached through another
 * prerequisite is dropped: if A enables B and B enables C, a declared A → C
 * adds no ordering and only clutters the wiring. The CSV keeps the edge, so a
 * human can still write the obvious one; the map just never draws it twice.
 */
function reduce(all: Topic[]): Topic[] {
  const lookup = Object.fromEntries(all.map((t) => [t.id, t]));
  const ancestorsOf = new Map<string, Set<string>>();
  const ancestors = (id: string, trail = new Set<string>()): Set<string> => {
    const cached = ancestorsOf.get(id);
    if (cached) return cached;
    const found = new Set<string>();
    if (!trail.has(id)) {
      trail.add(id);
      for (const p of lookup[id]?.prerequisites ?? []) {
        found.add(p);
        ancestors(p, trail).forEach((a) => found.add(a));
      }
      trail.delete(id);
    }
    ancestorsOf.set(id, found);
    return found;
  };
  return all.map((t) => ({
    ...t,
    prerequisites: t.prerequisites.filter((p) => !t.prerequisites.some((q) => q !== p && ancestors(q).has(p))),
  }));
}

export const topics: Topic[] = reduce(declared);

const visiting = new Set<string>(), visited = new Set<string>();
const assertAcyclic = (id: string) => { if (visiting.has(id)) throw new Error(`Prerequisite cycle includes ${id}`); if (visited.has(id)) return; visiting.add(id); for (const prerequisite of prerequisites.get(id) ?? []) assertAcyclic(prerequisite); visiting.delete(id); visited.add(id); };
for (const topic of declared) assertAcyclic(topic.id);

export const byId = Object.fromEntries(topics.map((t) => [t.id, t]));

/** IDs with an editor-written summary in topics.csv, as opposed to a notebook excerpt. */
export const curatedIds = new Set(
  topics.filter((t) => curatedByNotebook.has(t.notebook)).map((t) => t.id)
);

export const CATEGORIES = Array.from(new Set(topics.map((t) => t.category))).sort();

export const EDGE_COUNT = topics.reduce((n, t) => n + t.prerequisites.length, 0);

/**
 * Generated intros are a fixed-length slice of the notebook's first markdown
 * cell, so they stop mid-word. Cut back to the last complete sentence, or to a
 * word boundary, and mark the cut. Display only — the stored value is untouched.
 */
export function readableIntro(intro: string): string {
  const text = intro.trim();
  if (!text) return "";
  if (/[.!?]$/.test(text)) return text;

  const sentenceEnd = Math.max(text.lastIndexOf(". "), text.lastIndexOf("! "), text.lastIndexOf("? "));
  if (sentenceEnd > 90) return text.slice(0, sentenceEnd + 1);

  const wordEnd = text.lastIndexOf(" ");
  return `${text.slice(0, wordEnd > 60 ? wordEnd : text.length).replace(/[,;:]$/, "")}…`;
}

/** Topics this one unlocks directly. */
export function unlockedBy(id: string): Topic[] {
  return topics.filter((t) => t.prerequisites.includes(id));
}

/** Prerequisites of this one, in CSV order, resolved to topics. */
export function requiredBy(id: string): Topic[] {
  return (byId[id]?.prerequisites ?? []).map((p: string) => byId[p]).filter(Boolean);
}
