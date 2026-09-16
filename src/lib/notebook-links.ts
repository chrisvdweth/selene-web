import source from "../data/notebook-source.json";

export type NotebookProvenance = {
  commit: string;
  entries: Array<{ notebook: string; standalone: string | null; sha256: string }>;
};

export const upstream = source;
const repository = `${source.owner}/${source.repository}`;
const root = `https://github.com/${repository}/blob/${source.branch}/${source.notebooksPath}`;
const rawRoot = `https://raw.githubusercontent.com/${repository}/${source.branch}/${source.standalonePath}`;
const colabRoot = `https://githubtocolab.com/${repository}/blob/${source.branch}/${source.standalonePath}`;

export function originalSourceUrl(notebook: string) {
  return `${root}/${encodeURIComponent(notebook)}`;
}

export function standaloneDownloadUrl(standalone: string) {
  return `${rawRoot}/${encodeURIComponent(standalone)}`;
}

export function colabUrl(standalone: string) {
  return `${colabRoot}/${encodeURIComponent(standalone)}`;
}
