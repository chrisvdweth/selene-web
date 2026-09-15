import { useEffect, useMemo, useRef, useState } from "react";
import { categoryKey, type Topic } from "../lib/topics";

/**
 * A local dependency workbench, not a global atlas.
 *
 * The diagram draws one subject and the prerequisites that reach it, as an
 * orthogonal wiring schematic read top to bottom: every arrow means "enables".
 * It is measured, so one SVG user unit is one CSS pixel — labels stay crisp,
 * strokes stay hairline, and every node link is a real 56px touch target at
 * any viewport.
 */

/* `nearby` is company, not dependency: it is framed alongside the subject but
   never wired to it. */
export type Tier = { label: string; items: Topic[]; kind: "required" | "subject" | "unlocked" | "nearby" };

type Placed = {
  topic: Topic;
  kind: Tier["kind"];
  tier: number;
  x: number;
  y: number;
  w: number;
  /** Which row of its tier the node landed on, and how many rows that tier has. */
  row: number;
  rows: number;
};

const NODE_H = 56;
/* Siblings 12px apart read as one banded strip, and a fan-in channel drawn
   under them closed into a rectangle. 20px gives each node its own frame. */
const GAP_X = 20;
/* Rows inside one tier are reached from the bus, not through the gap, so the
   gap only has to clear the stub that leaves the row above it. */
const GAP_Y = 24;
const TIER_GAP = 52;
const LABEL_H = 20;
/* The narrowest node that can still hold a real topic title. Below roughly this
   width the longest names in the corpus ("Principal Component Analysis",
   "Retrieval Augmented Generation") clip, so a tier wraps to a second row
   instead of packing three truncated nodes across one. */
const MIN_W = 232;
const MAX_W = 300;
const SUBJECT_W = 300;
/* Room for the bypass lane plus air on both sides of it, so a skipping wire
   reads as a routed detour rather than a box drawn around the tier. */
const GUTTER = 36;
const BUS_INSET = 22;
const CORNER = 8;
/* A wire that leaves the bus enters its target through the left flank, at the
   node's own mid-height. Entering through the top would need a second corner
   level with the tier above and that is what drew a box around the node in
   between. */
const FLANK_GAP = 1;
/* Two wires arriving at the same node land on separate points of its top edge
   and turn at separate heights. A single shared channel plus two node bottoms
   closes into a rectangle; staggered elbows read as two inputs. */
const ENTRY_DROP = 14;
const ENTRY_STEP = 10;
/* Wide enough for three full-width nodes to fan out on one row, which is the
   widest tier the current map produces. Below this a three-way tier wrapped to
   two rows and two of its three wires became bus taps — correct, but a fan says
   "these three are siblings" and a bus does not. The space beyond this becomes
   margin rather than stretched nodes. */
const CONTENT_MAX = 856;
/* In grouped mode a tier's nodes sit inside one shared frame, and one wire
   joins that frame to the subject instead of one wire per node. */
const GROUP_PAD = 12;

/**
 * An orthogonal polyline with rounded corners. Raw 90-degree joins read as a
 * drawn rectangle; a filleted corner reads as a wire that was routed.
 */
export function orthPath(points: { x: number; y: number }[]) {
  const pts = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
  if (pts.length < 2) return "";

  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const inX = Math.sign(cur.x - prev.x);
    const inY = Math.sign(cur.y - prev.y);
    const outX = Math.sign(next.x - cur.x);
    const outY = Math.sign(next.y - cur.y);

    /* Collinear: nothing to fillet. */
    if (inX === outX && inY === outY) continue;

    const inLen = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
    const outLen = Math.abs(next.x - cur.x) + Math.abs(next.y - cur.y);
    const r = Math.min(CORNER, inLen / 2, outLen / 2);
    if (r < 1) {
      d += ` L${cur.x} ${cur.y}`;
      continue;
    }
    d += ` L${cur.x - inX * r} ${cur.y - inY * r}`;
    d += ` Q${cur.x} ${cur.y} ${cur.x + outX * r} ${cur.y + outY * r}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x} ${last.y}`;
  return d;
}

/** Deliberately pessimistic advance widths, so a clipped label can never
 *  push a node past the measured SVG edge. */
export const TITLE_ADVANCE = 9;
export const META_ADVANCE = 6.9;

export function clip(text: string, budget: number) {
  if (budget < 4) return "…";
  return text.length <= budget ? text : `${text.slice(0, budget - 1).trimEnd()}…`;
}

function rowsOf(count: number, available: number) {
  const perRow = Math.max(1, Math.min(count, Math.floor((available + GAP_X) / (MIN_W + GAP_X))));
  const rows: number[] = [];
  for (let i = 0; i < count; i += perRow) rows.push(Math.min(perRow, count - i));
  return { perRow, rows };
}

export default function DependencyDiagram({
  tiers,
  idPrefix,
  caption,
  grouped = false,
  onSelect,
  showLinks = false,
}: {
  tiers: Tier[];
  idPrefix: string;
  caption: string;
  /** Frame each non-subject tier as one group and wire it to the subject with a single arrow. */
  grouped?: boolean;
  /** When set, a plain click on a node hands the topic back instead of following its link. */
  onSelect?: (topic: Topic) => void;
  /** Name each node's direct link within the diagram on its second line, in
   *  place of difficulty and category. For views where a level-to-level arrow
   *  would otherwise be the only account of who leads to whom. */
  showLinks?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  /* The node under the pointer or holding focus. Everything not wired to it
     steps back so its direct links can be read off the picture. */
  const [hot, setHot] = useState<string | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    /* clientWidth, not the bounding box: once the diagram is tall enough to
       scroll, the scrollbar takes its lane out of the drawable width. */
    const measure = () => setWidth(Math.max(0, el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (width < 120) return null;

    const filled = tiers.filter((tier) => tier.items.length > 0);
    const ids = new Set(filled.flatMap((tier) => tier.items.map((t) => t.id)));

    const tierOf = new Map<string, number>();
    filled.forEach((tier, i) => tier.items.forEach((t) => tierOf.set(t.id, i)));
    const edges: { from: string; to: string; skips: boolean }[] = [];
    for (const tier of filled) {
      for (const target of tier.items) {
        for (const source of target.prerequisites) {
          if (!ids.has(source)) continue;
          const a = tierOf.get(source)!;
          const b = tierOf.get(target.id)!;
          if (a >= b) continue;
          edges.push({ from: source, to: target.id, skips: b - a > 1 });
        }
      }
    }

    /* The bypass lane is reserved for the two cases where a straight drop would
       cross a node: an edge that skips a tier, and a tier wide enough to wrap
       onto a second row. Measuring the wrap against the narrower guttered width
       keeps the decision self-consistent — a tier that does not wrap with the
       gutter would not wrap without it either. */
    const gutteredWidth = Math.min(width - GUTTER - 2, CONTENT_MAX);
    const anyWrap = filled.some(
      (tier) => tier.kind !== "subject" && rowsOf(tier.items.length, gutteredWidth).rows.length > 1
    );
    const needsBus = !grouped && (anyWrap || edges.some((e) => e.skips));
    const x0 = needsBus ? GUTTER : 0;
    /* Two pixels of slack keeps a rounded stroke inside the measured box. */
    const available = Math.min(width - x0 - 2, CONTENT_MAX);

    const placed: Placed[] = [];
    const tierLabels: { label: string; y: number; count: number }[] = [];
    const groups: {
      tier: number;
      kind: Tier["kind"];
      framed: boolean;
      x: number;
      y: number;
      w: number;
      h: number;
    }[] = [];
    let y = 0;

    filled.forEach((tier, tierIndex) => {
      tierLabels.push({ label: tier.label, y: y + 12, count: tier.items.length });
      let rowY = y + LABEL_H;

      if (tier.kind === "subject") {
        const w = Math.min(SUBJECT_W, available);
        placed.push({
          topic: tier.items[0],
          kind: tier.kind,
          tier: tierIndex,
          x: x0 + (available - w) / 2,
          y: rowY,
          w,
          row: 0,
          rows: 1,
        });
        y = rowY + NODE_H + TIER_GAP;
        return;
      }

      /* A group of one is just the node: no frame, no padding — the wire still
         lands on it the same way. */
      const framed = grouped && tier.items.length > 1;
      const pad = framed ? GROUP_PAD : 0;
      const inner = available - pad * 2;
      const { rows } = rowsOf(tier.items.length, inner);
      const groupTop = rowY;
      rowY += pad;
      let index = 0;
      rows.forEach((inRow, rowIndex) => {
        const w = Math.min(MAX_W, (inner - GAP_X * (inRow - 1)) / inRow);
        const rowWidth = w * inRow + GAP_X * (inRow - 1);
        let x = x0 + pad + (inner - rowWidth) / 2;
        for (let i = 0; i < inRow; i += 1) {
          placed.push({
            topic: tier.items[index],
            kind: tier.kind,
            tier: tierIndex,
            x,
            y: rowY,
            w,
            row: rowIndex,
            rows: rows.length,
          });
          x += w + GAP_X;
          index += 1;
        }
        rowY += NODE_H + GAP_Y;
      });
      if (grouped) {
        const nodes = placed.filter((p) => p.tier === tierIndex);
        const left = Math.min(...nodes.map((p) => p.x)) - pad;
        const right = Math.max(...nodes.map((p) => p.x + p.w)) + pad;
        groups.push({
          tier: tierIndex,
          kind: tier.kind,
          framed,
          x: left,
          y: groupTop,
          w: right - left,
          h: rowY - GAP_Y + pad - groupTop,
        });
        rowY += pad;
      }
      y = rowY - GAP_Y + TIER_GAP;
    });

    const height = Math.max(NODE_H + LABEL_H, y - TIER_GAP);
    const at = new Map(placed.map((p) => [p.topic.id, p]));

    if (grouped) {
      /* One wire between each tier and the next: a level reads as a unit, and
         "everything here comes before everything there" is exactly what a tier
         built from path depth means. The one-step wiring of who unlocks whom
         is the local view's job. Every box is centred, so each wire is a
         straight drop from one bottom edge to the next top edge. */
      const boxes = filled.map((tier, i) => {
        const group = groups.find((g) => g.tier === i);
        if (group) return { kind: tier.kind, top: group.y, bottom: group.y + group.h };
        const node = placed.find((p) => p.tier === i)!;
        return { kind: tier.kind, top: node.y, bottom: node.y + NODE_H };
      });
      const x = Math.round(x0 + available / 2);
      const wires = boxes.slice(1).flatMap((below, i) => {
        const above = boxes[i];
        if (above.kind === "nearby" || below.kind === "nearby") return [];
        return [
          {
            key: `tier-${i}`,
            active: above.kind === "subject" || below.kind === "subject",
            junction: { x, y: above.bottom + 8 },
            d: orthPath([
              { x, y: above.bottom },
              { x, y: below.top },
            ]),
          },
        ];
      });
      return { placed, tierLabels, groups, wires, edges, height, labelX: x0 };
    }
    /* The bus sits in its own lane outside the leftmost node, not tight against
       it — a wire running 14px off a node frame reads as part of the frame. */
    const busX = Math.max(4, Math.min(...placed.map((p) => p.x)) - BUS_INSET);

    /* Which wires can drop straight, and which have to take the bus. A straight
       drop is only safe when it leaves the last row of its tier and arrives at
       the first row of the next. Anything else would cross a node. */
    const routed = edges
      .filter(({ from, to }) => at.has(from) && at.has(to))
      .map(({ from, to, skips }) => {
        const a = at.get(from)!;
        const b = at.get(to)!;
        return { from, to, a, b, bus: skips || b.row > 0 || a.row < a.rows - 1 };
      });

    /* Landing slots are handed out per target, left to right, so two wires into
       one node never share a turn height or a landing point. */
    const slot = new Map<string, number>();
    const inbound = new Map<string, number>();
    for (const target of new Set(routed.map((r) => r.to))) {
      const dropping = routed
        .filter((r) => r.to === target && !r.bus)
        .sort((l, r) => l.a.x + l.a.w / 2 - (r.a.x + r.a.w / 2));
      inbound.set(target, dropping.length);
      dropping.forEach((r, i) => slot.set(`${r.from}->${r.to}`, i));
    }

    const wires = routed.map(({ from, to, a, b, bus }) => {
      const key = `${from}->${to}`;
      const ax = Math.round(a.x + a.w / 2);
      const ay = a.y + NODE_H;
      const active = a.kind === "subject" || b.kind === "subject";

      if (bus) {
        /* Out of the bottom into the gap under its own row, along the bus, then
           in through the target's flank. */
        const exitY = ay + 16;
        const entryY = Math.round(b.y + NODE_H / 2);
        return {
          key,
          active,
          junction: { x: busX, y: exitY },
          d: orthPath([
            { x: ax, y: ay },
            { x: ax, y: exitY },
            { x: busX, y: exitY },
            { x: busX, y: entryY },
            { x: b.x - FLANK_GAP, y: entryY },
          ]),
        };
      }

      const total = inbound.get(to) ?? 1;
      const index = slot.get(key) ?? 0;
      /* The outermost wire turns highest, so its horizontal run stays clear of
         the verticals of the wires inside it. */
      const turn = b.y - Math.min(ENTRY_DROP + (total - 1 - index) * ENTRY_STEP, TIER_GAP - 8);
      const entryX = Math.round(b.x + (b.w * (index + 1)) / (total + 1));
      return {
        key,
        active,
        junction: { x: entryX, y: turn },
        d: orthPath([
          { x: ax, y: ay },
          { x: ax, y: turn },
          { x: entryX, y: turn },
          { x: entryX, y: b.y },
        ]),
      };
    });

    return { placed, tierLabels, groups, wires, edges, height, labelX: x0 };
  }, [tiers, width, grouped]);

  const arrow = `${idPrefix}-arrow`;
  const arrowActive = `${idPrefix}-arrow-active`;

  /* Direct links per node, restricted to what is actually drawn. */
  const links = useMemo(() => {
    const map = new Map<string, { up: Topic[]; down: Topic[] }>();
    if (!layout) return map;
    const topic = new Map(layout.placed.map((p) => [p.topic.id, p.topic]));
    const of = (id: string) => {
      if (!map.has(id)) map.set(id, { up: [], down: [] });
      return map.get(id)!;
    };
    for (const { from, to } of layout.edges) {
      of(to).up.push(topic.get(from)!);
      of(from).down.push(topic.get(to)!);
    }
    return map;
  }, [layout]);

  const lit = useMemo(() => {
    if (!hot) return null;
    const near = links.get(hot);
    return new Set([hot, ...(near?.up ?? []).map((t) => t.id), ...(near?.down ?? []).map((t) => t.id)]);
  }, [hot, links]);

  /* Second line of a node. In a chain, the level arrow says only that a tier
     comes before the next; this names the actual neighbour. Requirements point
     forward to what they feed, unlocks point back to what they rest on. */
  const secondLine = (topic: Topic, kind: Tier["kind"]) => {
    const meta = `${topic.difficulty} · ${topic.category}`;
    if (!showLinks || kind === "subject" || kind === "nearby") return meta;
    const near = links.get(topic.id);
    const named = kind === "required" ? near?.down : near?.up;
    if (!named?.length) return meta;
    return `${kind === "required" ? "→" : "←"} ${named.map((t) => t.title).join(", ")}`;
  };

  return (
    <div>
      {/* The drawing scrolls on its own once it outgrows the viewport; the
          legend stays put beneath it. */}
      <div ref={wrap} className="diagram-scroll">
        {layout && (
          <svg
            className={`diagram${lit ? " diagram-focused" : ""}`}
            width={width}
            height={layout.height}
            viewBox={`0 0 ${width} ${layout.height}`}
            role="group"
            aria-label={caption}
          >
            <defs>
              <marker id={arrow} viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path className="arrow-head" d="M1 1 6.5 4 1 7z" />
              </marker>
              <marker
                id={arrowActive}
                viewBox="0 0 8 8"
                refX="6.5"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path className="arrow-head arrow-head-active" d="M1 1 6.5 4 1 7z" />
              </marker>
            </defs>

            {layout.tierLabels.map((label) => (
              <text key={`${label.label}-${label.y}`} className="tier-label" x={layout.labelX} y={label.y}>
                {label.label.toUpperCase()} · {label.count}
              </text>
            ))}

            {layout.groups
              .filter((group) => group.framed)
              .map((group) => (
                <rect
                  key={`g-${group.tier}`}
                  className="group-frame"
                  x={group.x}
                  y={group.y}
                  width={group.w}
                  height={group.h}
                />
              ))}

            {layout.wires.map((wire) => (
              <path
                key={wire.key}
                className={wire.active ? "wire wire-active" : "wire"}
                d={wire.d}
                markerEnd={`url(#${wire.active ? arrowActive : arrow})`}
              />
            ))}

            {layout.wires
              .filter((wire) => wire.active)
              .map((wire) => (
                <rect
                  key={`j-${wire.key}`}
                  className="junction"
                  x={wire.junction.x - 1.5}
                  y={wire.junction.y - 1.5}
                  width="3"
                  height="3"
                />
              ))}

            {layout.placed.map((node) => {
              const titleBudget = Math.floor((node.w - 24) / TITLE_ADVANCE);
              const metaBudget = Math.floor((node.w - 36) / META_ADVANCE);
              const meta = `${node.topic.difficulty} · ${node.topic.category}`;
              const line = secondLine(node.topic, node.kind);
              const dim = lit !== null && !lit.has(node.topic.id);
              return (
                <a
                  key={node.topic.id}
                  className={`topic-node${node.kind === "subject" ? " node-subject" : ""}${dim ? " node-dim" : ""}`}
                  href={`/topics/${node.topic.id}`}
                  data-topic={node.topic.id}
                  data-topic-href={`/topics/${node.topic.id}`}
                  onMouseEnter={() => setHot(node.topic.id)}
                  onMouseLeave={() => setHot(null)}
                  onFocus={() => setHot(node.topic.id)}
                  onBlur={() => setHot(null)}
                  onClick={(event) => {
                    if (!onSelect || node.kind === "subject") return;
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onSelect(node.topic);
                  }}
                >
                  <title>{`${node.topic.title} — ${meta}. ${onSelect ? "Select this topic." : "Open the notebook dossier."}`}</title>
                  <rect className="node-frame" x={node.x} y={node.y} width={node.w} height={NODE_H} />
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
          </svg>
        )}
      </div>
      {/* Only what cannot be read off the drawing itself: the arrow's
          meaning, and the second-line notation where it is used. */}
      {layout && !tiers.some((tier) => tier.kind === "nearby") && (
        <p className="diagram-legend">
          <span>
            <svg width="24" height="8" aria-hidden="true" focusable="false">
              <path className="wire wire-active" d="M0 4h14" />
              <path className="arrow-head arrow-head-active" d="M15 1 21 4 15 7z" />
            </svg>
            enables
          </span>
          {showLinks && <span>← requires · → unlocks</span>}
        </p>
      )}
    </div>
  );
}
