import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { META_ADVANCE, TITLE_ADVANCE, clip, orthPath } from "./DependencyDiagram";
import { categoryKey, type Topic } from "../lib/topics";

/**
 * The whole map on one pannable canvas.
 *
 * Layered, not force-directed: a level is a row, and the same level is the
 * same row in every tree, so "what can I start after level two" reads across
 * the page. Separate trees sit side by side. The canvas pans by dragging and
 * zooms with the buttons or a modified wheel, so a plain scroll still moves
 * the page.
 */

const NODE_W = 232;
const NODE_H = 56;
const GAP_X = 20;
const LEVEL_GAP = 72;
const TREE_GAP = 72;
const PAD = 24;
const CORNER_DROP = 24;
const VIEW_H = 560;

type Placed = { topic: Topic; level: number; tree: number; x: number; y: number };

export type MapGraphProps = {
  /** Every topic on the map. Prerequisites outside this set are ignored. */
  topics: Topic[];
  levelLabel?: (level: number) => string;
};

export function layout(topics: Topic[]) {
  const ids = new Set(topics.map((t) => t.id));
  const byId = new Map(topics.map((t) => [t.id, t]));
  const parents = (t: Topic) => t.prerequisites.filter((p) => ids.has(p));
  const children = new Map<string, string[]>();
  for (const t of topics) for (const p of parents(t)) children.set(p, [...(children.get(p) ?? []), t.id]);

  /* Longest path from a root decides the level, so nothing sits above
     anything it depends on. */
  const level = new Map<string, number>();
  const depth = (id: string, trail = new Set<string>()): number => {
    if (level.has(id)) return level.get(id)!;
    if (trail.has(id)) return 0;
    trail.add(id);
    const above = parents(byId.get(id)!).map((p) => depth(p, trail));
    const d = above.length ? Math.max(...above) + 1 : 0;
    level.set(id, d);
    return d;
  };
  topics.forEach((t) => depth(t.id));

  /* Connected components, so unrelated trees never interleave. */
  const tree = new Map<string, number>();
  let trees = 0;
  for (const t of topics) {
    if (tree.has(t.id)) continue;
    const stack = [t.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (tree.has(id)) continue;
      tree.set(id, trees);
      stack.push(...parents(byId.get(id)!), ...(children.get(id) ?? []));
    }
    trees += 1;
  }

  const levels = Math.max(0, ...level.values()) + 1;
  const rowY = (l: number) => PAD + l * (NODE_H + LEVEL_GAP);
  const placed: Placed[] = [];
  let treeX = PAD;

  for (let k = 0; k < trees; k += 1) {
    const members = topics.filter((t) => tree.get(t.id) === k);
    const rows: Topic[][] = Array.from({ length: levels }, () => []);
    for (const t of members) rows[level.get(t.id)!].push(t);
    const width = Math.max(...rows.map((row) => row.length * NODE_W + (row.length - 1) * GAP_X));

    /* Order each row under the mean position of its parents, so wires drop
       rather than cross. The first row has nothing above it and reads A to Z. */
    const centre = new Map<string, number>();
    rows.forEach((row, l) => {
      const sorted = [...row].sort((a, b) => {
        if (l === 0) return a.title.localeCompare(b.title);
        const mean = (t: Topic) => {
          const xs = parents(t).map((p) => centre.get(p) ?? 0);
          return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
        };
        return mean(a) - mean(b) || a.title.localeCompare(b.title);
      });
      const rowWidth = sorted.length * NODE_W + (sorted.length - 1) * GAP_X;
      let x = treeX + (width - rowWidth) / 2;
      for (const t of sorted) {
        placed.push({ topic: t, level: l, tree: k, x, y: rowY(l) });
        centre.set(t.id, x + NODE_W / 2);
        x += NODE_W + GAP_X;
      }
    });
    treeX += width + TREE_GAP;
  }

  const at = new Map(placed.map((p) => [p.topic.id, p]));
  const wires = topics.flatMap((t) =>
    parents(t).map((p) => {
      const a = at.get(p)!;
      const b = at.get(t.id)!;
      const ax = a.x + NODE_W / 2;
      const bx = b.x + NODE_W / 2;
      /* Drop out of the parent, run across just above the child, drop in. */
      const turn = b.y - CORNER_DROP;
      return {
        key: `${p}->${t.id}`,
        from: p,
        to: t.id,
        d: orthPath([
          { x: ax, y: a.y + NODE_H },
          { x: ax, y: turn },
          { x: bx, y: turn },
          { x: bx, y: b.y },
        ]),
      };
    })
  );

  const width = Math.max(treeX - TREE_GAP + PAD, 320);
  const height = rowY(levels - 1) + NODE_H + PAD;
  return { placed, wires, levels, rowY, width, height, links: { parents, children } };
}

export default function MapGraph({ topics, levelLabel = (l) => (l === 0 ? "Start here" : `Level ${l + 1}`) }: MapGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [viewW, setViewW] = useState(0);
  const [hot, setHot] = useState<string | null>(null);

  const graph = useMemo(() => layout(topics), [topics]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => setViewW(svg.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  /* A focused topic: the whole path through it — everything it rests on and
     everything it leads to — is held bright, and the view is fitted to it.
     Arrives as ?focus=<id> from the topic browser and the dossier. */
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("focus");
    if (id && graph.placed.some((p) => p.topic.id === id)) setFocus(id);
  }, [graph]);

  const path = useMemo(() => {
    if (!focus) return null;
    const byId = new Map(graph.placed.map((p) => [p.topic.id, p.topic]));
    const seen = new Set<string>([focus]);
    const walk = (id: string, next: (id: string) => string[]) => {
      for (const n of next(id)) if (!seen.has(n)) { seen.add(n); walk(n, next); }
    };
    walk(focus, (id) => graph.links.parents(byId.get(id)!));
    walk(focus, (id) => graph.links.children.get(id) ?? []);
    return seen;
  }, [focus, graph]);

  /* Fit a set of nodes into the window — the whole map by default. */
  const fitTo = (ids?: Set<string>) => {
    const svg = svgRef.current;
    const behaviour = zoomRef.current;
    if (!svg || !behaviour || !viewW) return;
    const nodes = ids ? graph.placed.filter((p) => ids.has(p.topic.id)) : graph.placed;
    const x0 = ids ? Math.min(...nodes.map((p) => p.x)) - PAD : 0;
    const y0 = ids ? Math.min(...nodes.map((p) => p.y)) - PAD - 24 : 0;
    const x1 = ids ? Math.max(...nodes.map((p) => p.x + NODE_W)) + PAD : graph.width;
    const y1 = ids ? Math.max(...nodes.map((p) => p.y + NODE_H)) + PAD : graph.height;
    const w = x1 - x0;
    const h = y1 - y0;
    const scale = Math.min(1, (viewW - 2 * PAD) / w, (VIEW_H - 2 * PAD) / h);
    const tx = (viewW - w * scale) / 2 - x0 * scale;
    const ty = Math.max(PAD, (VIEW_H - h * scale) / 2) - y0 * scale;
    select(svg).call(behaviour.transform, zoomIdentity.translate(tx, ty).scale(scale));
  };
  const fit = () => fitTo(path ?? undefined);

  const clearFocus = () => {
    setFocus(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    window.history.replaceState(null, "", url);
  };

  useEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return;
    const behaviour = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2])
      /* Plain wheel scrolls the page. Zoom wants a modifier, a pinch, or the
         buttons; dragging pans. */
      .filter((event) => {
        if (event.type === "wheel") return event.ctrlKey || event.metaKey;
        return !event.button;
      })
      .on("zoom", (event) => {
        layer.setAttribute("transform", event.transform.toString());
      });
    zoomRef.current = behaviour;
    const selection = select(svg).call(behaviour);
    return () => {
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  useEffect(fit, [viewW, graph, path]);

  const zoomBy = (k: number) => {
    const svg = svgRef.current;
    const behaviour = zoomRef.current;
    if (svg && behaviour) select(svg).call(behaviour.scaleBy, k);
  };

  /* Hover takes precedence over the pinned path, so you can still read one
     node's direct links inside a highlighted route. */
  const lit = useMemo(() => {
    if (!hot) return path;
    const topic = graph.placed.find((p) => p.topic.id === hot)?.topic;
    if (!topic) return path;
    return new Set([hot, ...graph.links.parents(topic), ...(graph.links.children.get(hot) ?? [])]);
  }, [hot, path, graph]);

  const titleBudget = Math.floor((NODE_W - 24) / TITLE_ADVANCE);
  const metaBudget = Math.floor((NODE_W - 36) / META_ADVANCE);
  const nameOf = new Map(graph.placed.map((p) => [p.topic.id, p.topic.title]));

  return (
    <div className="map-canvas">
      {focus && path && (
        <p className="map-focus" role="status">
          <span>
            Showing the path through <b>{nameOf.get(focus)}</b>
            <span className="data"> · {path.size} notebooks</span>
          </span>
          <button type="button" className="button-primary" onClick={clearFocus}>
            Clear filtered path
          </button>
        </p>
      )}
      <div className="map-tools">
        <button type="button" className="button-ghost" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="button-ghost" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="button-ghost" onClick={fit}>
          {focus ? "Fit to path" : "Fit to view"}
        </button>
      </div>

      <svg
        ref={svgRef}
        className={`diagram map-svg${lit ? " diagram-focused" : ""}`}
        height={VIEW_H}
        role="group"
        aria-label="Every prerequisite link between notebooks, in levels from the starting points down"
      >
        <title>Drag to pan · ⌘ or Ctrl + scroll to zoom</title>
        <defs>
          <marker id="map-arrow" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path className="arrow-head" d="M1 1 6.5 4 1 7z" />
          </marker>
        </defs>
        <g ref={layerRef}>
          {Array.from({ length: graph.levels }, (_, l) => (
            <g key={l}>
              <line
                className="level-rule"
                x1={PAD}
                x2={graph.width - PAD}
                y1={graph.rowY(l) - 12}
                y2={graph.rowY(l) - 12}
              />
              <text className="tier-label" x={PAD} y={graph.rowY(l) - 18}>
                {levelLabel(l).toUpperCase()} · {graph.placed.filter((p) => p.level === l).length}
              </text>
            </g>
          ))}

          {graph.wires.map((wire) => (
            <path
              key={wire.key}
              className={`wire${lit && !lit.has(wire.from) && !lit.has(wire.to) ? " wire-dim" : ""}${
                lit && lit.has(wire.from) && lit.has(wire.to) ? " wire-active" : ""
              }`}
              d={wire.d}
              markerEnd="url(#map-arrow)"
            />
          ))}

          {graph.placed.map((node) => {
            const above = graph.links.parents(node.topic).map((p) => nameOf.get(p) ?? p);
            const line = above.length
              ? `← ${above.join(", ")}`
              : `${node.topic.difficulty} · ${node.topic.category}`;
            const dim = lit !== null && !lit.has(node.topic.id);
            return (
              <a
                key={node.topic.id}
                className={`topic-node${dim ? " node-dim" : ""}${node.topic.id === focus ? " node-subject" : ""}`}
                href={`/topics/${node.topic.id}`}
                onMouseEnter={() => setHot(node.topic.id)}
                onMouseLeave={() => setHot(null)}
                onFocus={() => setHot(node.topic.id)}
                onBlur={() => setHot(null)}
              >
                <title>{`${node.topic.title} — ${node.topic.difficulty} · ${node.topic.category}. Open the notebook dossier.`}</title>
                <rect className="node-frame" x={node.x} y={node.y} width={NODE_W} height={NODE_H} />
                <text className="node-title" x={node.x + 12} y={node.y + 24}>
                  {clip(node.topic.title, titleBudget)}
                </text>
                <rect
                  className={`node-swatch cat-${categoryKey(node.topic.category)}`}
                  x={node.x + 12}
                  y={node.y + 34}
                  width="6"
                  height="6"
                  style={{ fill: "var(--cat)" }}
                />
                <text className="node-meta" x={node.x + 24} y={node.y + 41}>
                  {clip(line, metaBudget)}
                </text>
              </a>
            );
          })}
        </g>
      </svg>

      <p className="diagram-legend">
        <span>
          <svg width="24" height="8" aria-hidden="true" focusable="false">
            <path className="wire wire-active" d="M0 4h14" />
            <path className="arrow-head arrow-head-active" d="M15 1 21 4 15 7z" />
          </svg>
          enables
        </span>
        <span>← requires</span>
      </p>
    </div>
  );
}
