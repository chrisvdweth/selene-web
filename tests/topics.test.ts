import { describe, it, expect } from "vitest";
import { topics, byId } from "../src/lib/topics";
describe("topic data", () => {
  it("discovers a deterministic crawlable notebook manifest", () => expect(topics.length).toBeGreaterThan(6));
  it("has unique IDs", () => expect(new Set(topics.map((t) => t.id)).size).toBe(topics.length));
  it("only links known prerequisites", () => topics.forEach((t) => t.prerequisites.forEach((id) => expect(byId[id]).toBeTruthy())));
  it("keeps no prerequisite that is already implied by another", () => {
    const ancestors = (id: string, seen = new Set<string>()): Set<string> => {
      for (const p of byId[id]?.prerequisites ?? []) if (!seen.has(p)) { seen.add(p); ancestors(p, seen); }
      return seen;
    };
    topics.forEach((t) =>
      t.prerequisites.forEach((p) =>
        t.prerequisites.filter((q) => q !== p).forEach((q) => expect(ancestors(q).has(p)).toBe(false))
      )
    );
  });
  it("drops linear-regression -> neural-networks, which runs through gradient-descent", () =>
    expect(byId["neural-networks"].prerequisites).toEqual(["gradient-descent"]));
});
