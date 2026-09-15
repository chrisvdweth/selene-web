import rows from "../data/topics.csv?raw";
import discovered from "../data/generated-topics.json";

export type Topic = {
  id: string;
  title: string;
  category: string;
  subtopic: string;
  difficulty: string;
  intro: string;
  notebook: string;
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
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const keys = head.split(",");
  return lines.map((line) => Object.fromEntries(keys.map((key, i) => [key, line.split(",")[i] ?? ""])));
}

const curated = csv(rows) as any[];
const curatedByNotebook = new Map(curated.map((row) => [row.notebook, row]));

const declared: Topic[] = (discovered as any[]).map((found: any) => {
  const row = curatedByNotebook.get(found.notebook) || {};
  return { ...found, ...row, prerequisites: row.prerequisites ? row.prerequisites.split("|") : [] };
});

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
