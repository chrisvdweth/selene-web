import { describe, expect, it } from "vitest";
import provenance from "../src/data/notebook-provenance.json";
import { colabUrl, originalSourceUrl, standaloneDownloadUrl } from "../src/lib/notebook-links";

describe("notebook actions", () => {
  it("uses the upstream master originals and standalone Colab format", () => {
    const mapped = provenance.entries.find((entry) => entry.standalone);
    expect(mapped).toBeTruthy();
    expect(originalSourceUrl(mapped!.notebook)).toContain("github.com/chrisvdweth/selene/blob/master/notebooks/");
    expect(standaloneDownloadUrl(mapped!.standalone!)).toContain("raw.githubusercontent.com/chrisvdweth/selene/master/notebooks/standalone/");
    expect(colabUrl(mapped!.standalone!)).toBe(`https://githubtocolab.com/chrisvdweth/selene/blob/master/notebooks/standalone/${mapped!.standalone}`);
  });

  it("records an unavailable standalone action instead of inventing a link", () => {
    expect(provenance.entries.find((entry) => entry.notebook === "dimensionality_reduction_techniques_overview.ipynb")?.standalone).toBeNull();
  });
});
