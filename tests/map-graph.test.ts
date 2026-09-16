import { describe, it, expect } from "vitest";
import { layout } from "../src/components/MapGraph";
import type { Topic } from "../src/lib/topics";

const topic = (id: string, prerequisites: string[] = []): Topic => ({
  id,
  title: id,
  category: "Foundations",
  subtopic: "",
  difficulty: "Beginner",
  intro: "",
  notebook: `${id}.ipynb`,
  standalone: `${id}_standalone.ipynb`,
  prerequisites,
});

/* Two unrelated trees: a → b → c, and x → y. */
const forest = [topic("a"), topic("b", ["a"]), topic("c", ["b"]), topic("x"), topic("y", ["x"])];

describe("map layout", () => {
  const { placed, wires } = layout(forest);
  const at = (id: string) => placed.find((p) => p.topic.id === id)!;

  it("puts the same level on the same row in every tree", () => {
    expect(at("a").y).toBe(at("x").y);
    expect(at("b").y).toBe(at("y").y);
    expect(at("c").y).toBeGreaterThan(at("b").y);
  });

  it("keeps separate trees side by side without overlap", () => {
    const tree = (k: number) => placed.filter((p) => p.tree === k);
    const right = Math.max(...tree(0).map((p) => p.x + 232));
    const left = Math.min(...tree(1).map((p) => p.x));
    expect(new Set(placed.map((p) => p.tree)).size).toBe(2);
    expect(left).toBeGreaterThan(right);
  });

  it("wires every prerequisite exactly once", () => {
    expect(wires.map((w) => w.key).sort()).toEqual(["a->b", "b->c", "x->y"]);
  });

  it("drops a child straight under its only parent", () => {
    expect(at("b").x).toBe(at("a").x);
    expect(at("c").x).toBe(at("b").x);
  });
});
