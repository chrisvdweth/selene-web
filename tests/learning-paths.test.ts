import { describe, expect, it } from "vitest";
import paths from "../src/data/learning-paths.json";
import { firstUnfinished, pathContext, pathLessons, pathNotebookUrl, pathsForTopic } from "../src/lib/learning-paths";

describe("learning path navigation", () => {
  const path = paths[0];

  it("follows the curated lesson order across stage boundaries", () => {
    expect(pathContext("data-normalization-overview", path.id)).toMatchObject({
      previous: "numpy-basic-tutorial",
      next: "linear-regression",
      index: 1,
      total: 12,
    });
  });

  it("stops at the first and last lessons without wrapping", () => {
    const lessons = pathLessons(path);
    expect(pathContext(lessons[0], path.id)?.previous).toBeUndefined();
    expect(pathContext(lessons.at(-1)!, path.id)?.next).toBeUndefined();
  });

  it("requires an explicit valid path that contains the current notebook", () => {
    expect(pathContext("numpy-basic-tutorial", null)).toBeNull();
    expect(pathContext("numpy-basic-tutorial", "missing")).toBeNull();
    expect(pathContext("numpy-basic-tutorial", "language-models-end-to-end")).toBeNull();
    expect(pathContext("missing", path.id)).toBeNull();
    expect(pathsForTopic("numpy-basic-tutorial").map((item) => item.id)).toEqual([path.id]);
    expect(pathsForTopic("missing")).toEqual([]);
  });

  it("resumes the earliest unfinished lesson even when later lessons are complete", () => {
    const lessons = pathLessons(path);
    expect(firstUnfinished(path, new Set())).toBe(lessons[0]);
    const completed = new Set(lessons.filter((_, index) => index !== 1));
    expect(firstUnfinished(path, completed)).toBe(lessons[1]);
    expect(completed.size).toBe(lessons.length - 1);
    expect(firstUnfinished(path, new Set(lessons))).toBeUndefined();
  });

  it("excludes unavailable lessons from navigation and resume", () => {
    const withMissing = { ...path, stages: [{ title: "Stage", description: "", lessons: ["missing", "numpy-basic-tutorial"] }] };
    expect(pathLessons(withMissing)).toEqual(["numpy-basic-tutorial"]);
    expect(firstUnfinished(withMissing, new Set())).toBe("numpy-basic-tutorial");
  });

  it("preserves path context in notebook links", () => {
    expect(pathNotebookUrl("linear-regression", path.id)).toBe("/topics/linear-regression?path=learning-from-data");
  });

  it("offers every membership and follows the chosen path for a shared notebook", () => {
    expect(pathsForTopic("adam-optimizer").map((item) => item.id)).toEqual([
      "learning-from-data", "neural-networks-by-hand",
    ]);
    expect(pathContext("adam-optimizer", null)).toBeNull();
    expect(pathContext("adam-optimizer", "learning-from-data")).toMatchObject({
      previous: "gradient-descent-momentum", next: "bias-variance-ml-basics",
    });
    expect(pathContext("adam-optimizer", "neural-networks-by-hand")).toMatchObject({
      previous: "ann-from-scratch-numpy-only", next: "nn-layer-normalization",
    });
  });

  it("shares notebook completion across its paths when resuming", () => {
    for (const membership of pathsForTopic("adam-optimizer")) {
      const lessons = pathLessons(membership);
      const index = lessons.indexOf("adam-optimizer");
      const completed = new Set(lessons.slice(0, index));
      expect(firstUnfinished(membership, completed)).toBe("adam-optimizer");
      completed.add("adam-optimizer");
      expect(firstUnfinished(membership, completed)).toBe(lessons[index + 1]);
    }
  });
});
