import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import provenance from "../src/data/notebook-provenance.json";
import health from "../src/data/notebook-health.json";

const script = fileURLToPath(new URL("../scripts/check-notebook-health.mjs", import.meta.url));
const directories: string[] = [];
const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), "selene-health-"));
  directories.push(directory);
  const write = (path: string, value: unknown) => {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value));
  };
  write("src/data/notebook-provenance.json", provenance);
  write("src/data/notebook-health.json", health);
  return {
    directory,
    write,
    report: () => JSON.parse(readFileSync(join(directory, "src/data/notebook-health.json"), "utf8")) as typeof health,
    run: () => spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" }),
  };
};

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("notebook health checks", () => {
  it("validates the committed snapshot in a clean checkout without the disposable source cache", () => {
    const context = fixture();
    expect(context.run().status).toBe(0);
    expect(context.report().summary).toEqual({ passed: provenance.entries.length, warning: 0, failed: 0, reused: provenance.entries.length });
    expect(context.report().assets).toEqual(health.assets);
    expect(context.report().commit).toBe(provenance.commit);
  });

  it("reports missing source data when a content update omits health results", () => {
    const context = fixture();
    context.write("src/data/notebook-health.json", { ...health, files: health.files.slice(1) });
    const result = context.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(provenance.entries[0].notebook);
    expect(result.stderr).toContain("npm run notebooks:sync");
    expect(context.report().summary.failed).toBe(1);
  });

  it("retries a failed check once the source notebook is available", () => {
    const context = fixture();
    const entry = provenance.entries[0];
    context.write("src/data/notebook-health.json", { ...health, files: health.files.map((file) => file.sha256 === entry.sha256 ? { ...file, status: "failed", errors: ["Source was unavailable"] } : file) });
    context.write(`.cache/notebooks/${provenance.commit}/${entry.notebook}`, { nbformat: 4, cells: [{ cell_type: "markdown", source: ["Notebook content"] }] });
    expect(context.run().status).toBe(0);
    expect(context.report().files[0]).toMatchObject({ status: "passed", reused: false, errors: [] });
  });

  it("continues rejecting invalid notebooks", () => {
    const context = fixture();
    const entry = provenance.entries[0];
    context.write("src/data/notebook-health.json", { ...health, files: health.files.slice(1) });
    context.write(`.cache/notebooks/${provenance.commit}/${entry.notebook}`, { nbformat: 3, cells: [] });
    expect(context.run().status).not.toBe(0);
    expect(context.report().files[0].errors).toContain("nbformat must be 4 or newer");
  });

  it("uses fresh asset results when available", () => {
    const context = fixture();
    const missing = { asset: "images/missing.png", status: "missing", detail: "Upstream returned 404" };
    context.write(`.cache/notebooks/${provenance.commit}/asset-health.json`, { assets: [{ asset: "images/available.png", status: "available" }, missing] });
    expect(context.run().status).toBe(0);
    expect(context.report().assets).toEqual({ available: 1, missing: [missing] });
  });
});
