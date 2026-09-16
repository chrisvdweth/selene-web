import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const provenance = JSON.parse(await readFile("src/data/notebook-provenance.json", "utf8"));
const previous = JSON.parse(await readFile("src/data/notebook-health.json", "utf8").catch(() => "{\"files\":[]}"));
const previousByHash = new Map(previous.files?.map((file) => [file.sha256, file]) ?? []);

const allowedCells = new Set(["code", "markdown", "raw"]);
const allowedOutputs = new Set(["execute_result", "display_data", "stream", "error"]);

function checkNotebook(notebook, document) {
  const errors = [];
  const warnings = [];
  if (!Number.isInteger(document.nbformat) || document.nbformat < 4) errors.push("nbformat must be 4 or newer");
  if (!Array.isArray(document.cells)) errors.push("cells must be an array");
  else document.cells.forEach((cell, index) => {
    const label = `cell ${index + 1}`;
    if (!cell || typeof cell !== "object") return errors.push(`${label} must be an object`);
    if (!allowedCells.has(cell.cell_type)) errors.push(`${label} has unsupported type ${String(cell.cell_type)}`);
    if (!(typeof cell.source === "string" || Array.isArray(cell.source))) errors.push(`${label} source must be text`);
    if (Array.isArray(cell.source) && cell.source.some((line) => typeof line !== "string")) errors.push(`${label} source contains non-text data`);
    if (cell.cell_type === "code") {
      if (cell.outputs !== undefined && !Array.isArray(cell.outputs)) errors.push(`${label} outputs must be an array`);
      for (const output of cell.outputs ?? []) {
        if (!output || typeof output !== "object" || !allowedOutputs.has(output.output_type)) errors.push(`${label} has an invalid output`);
        if (output.output_type === "error" && !Array.isArray(output.traceback)) warnings.push(`${label} error output has no traceback`);
      }
    }
  });
  return { notebook, status: errors.length ? "failed" : warnings.length ? "warning" : "passed", errors, warnings };
}

const files = [];
for (const entry of provenance.entries) {
  const cached = previousByHash.get(entry.sha256);
  if (cached) {
    files.push({ ...cached, notebook: entry.notebook, sha256: entry.sha256, reused: true });
    continue;
  }
  try {
    const document = JSON.parse(await readFile(resolve(".cache/notebooks", provenance.commit, entry.notebook), "utf8"));
    files.push({ ...checkNotebook(entry.notebook, document), sha256: entry.sha256, reused: false });
  } catch (error) {
    files.push({ notebook: entry.notebook, sha256: entry.sha256, status: "failed", errors: [`Unable to parse notebook: ${error.message}`], warnings: [], reused: false });
  }
}

const summary = files.reduce((total, file) => {
  total[file.status] += 1;
  total.reused += Number(file.reused);
  return total;
}, { passed: 0, warning: 0, failed: 0, reused: 0 });
const report = { repository: provenance.repository, commit: provenance.commit, files, summary };
await writeFile("src/data/notebook-health.json", `${JSON.stringify(report, null, 2)}\n`);
if (summary.failed) throw new Error(`${summary.failed} notebook health check${summary.failed === 1 ? "" : "s"} failed`);
console.log(`Checked ${files.length - summary.reused} changed notebook${files.length - summary.reused === 1 ? "" : "s"}; reused ${summary.reused}.`);
