import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import DependencyDiagram, { type Tier } from "./DependencyDiagram";
import { localTiers } from "./LocalDependencies";
import { ArrowIcon, SearchIcon } from "./Icon";
import {
  CATEGORIES,
  byId,
  categoryKey,
  curatedIds,
  readableIntro,
  topics,
  unlockedBy,
  requiredBy,
  type Topic,
} from "../lib/topics";

/**
 * The topic browser: an index on the left, one selected topic in the middle,
 * and that topic's local dependencies underneath it.
 *
 * Deliberately not a global atlas. 82 notebooks on one canvas is a picture of a
 * corpus; three tiers around the thing you are about to run is a picture of
 * your next step.
 */

export type Scope = "local" | "chain" | "unlocks" | "nearby";

/* `label` names the mode on the switcher, where it sits beside its siblings and
   has to stay short. `panel` titles the diagram itself, where it stands alone
   and has to read as a sentence fragment someone wrote: appending " dependencies"
   to the switcher label gave "Prerequisite chain dependencies". `caption` is the
   diagram's accessible name, which is read aloud and so has to be a whole
   phrase naming the subject. `title` and `lead` head the standalone graph page
   for the scope. */
export const SCOPES: {
  id: Scope;
  route: string;
  label: string;
  panel: string;
  caption: (title: string) => string;
  title: string;
  lead: string;
}[] = [
  {
    id: "local",
    route: "show",
    label: "Local",
    panel: "Local dependencies",
    caption: (title) => `Local dependencies of ${title}: what it requires, and what it unlocks`,
    title: "What this topic requires",
    lead: "Direct prerequisites above, everything it unlocks below. One step in each direction — enough to decide what to open next.",
  },
  {
    id: "chain",
    route: "mastery",
    label: "Prerequisite chain",
    panel: "The whole prerequisite chain",
    caption: (title) => `The whole prerequisite chain leading to ${title}, furthest back first`,
    title: "The whole run-up",
    lead: "Every notebook that has to come first, ordered by how far back it sits. Work down the tiers to reach the selected topic.",
  },
  {
    id: "unlocks",
    route: "unlocks",
    label: "Unlock chain",
    panel: "The whole unlock chain",
    caption: (title) => `The whole unlock chain leading on from ${title}, nearest first`,
    title: "Where this leads",
    lead: "Every notebook this topic opens up, ordered by how far on it sits. Work down the tiers to see what finishing this makes possible.",
  },
  {
    id: "nearby",
    route: "nearby",
    label: "Nearby",
    panel: "Nearby in the same category",
    caption: (title) => `Notebooks in the same category as ${title}, not linked to it by a prerequisite`,
    title: "Nearby in the same category",
    lead: "Every other notebook in this category that is not wired to the topic. Company rather than dependency — somewhere to go next when you are not following a path.",
  },
];

/** A left click with no modifier — the only kind we take over from the browser.
 *  Middle-click, cmd-click and the like still open the link on their own. */
export function plainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Same category as the subject and not wired to it in either direction. */
export function nearbyTo(subject: Topic): Topic[] {
  const linked = new Set([subject.id, ...subject.prerequisites, ...unlockedBy(subject.id).map((t) => t.id)]);
  return topics.filter((t) => t.category === subject.category && !linked.has(t.id));
}

/**
 * Longest-path depth of every topic reachable from `id`, walking either up the
 * prerequisites or down to what they unlock.
 */
function depthsFrom(id: string, next: (topicId: string) => Topic[]): Map<string, number> {
  const depths = new Map<string, number>();
  const walk = (current: string, depth: number) => {
    for (const neighbour of next(current)) {
      if ((depths.get(neighbour.id) ?? 0) < depth) depths.set(neighbour.id, depth);
      walk(neighbour.id, depth + 1);
    }
  };
  walk(id, 1);
  return depths;
}

/* Parenthesised, because the diagram renders every tier label as
   "LABEL · count". The bare form produced "REQUIRES · 2 STEPS BACK · 1",
   three dot-separated parts where only the last is a number. */
function chainTiers(
  depths: Map<string, number>,
  keep: (t: Topic) => boolean,
  kind: "required" | "unlocked",
  label: (level: number) => string
): Tier[] {
  const levels = Array.from(new Set([...depths.values()])).sort((a, b) => a - b);
  return levels.map((level) => ({
    label: label(level),
    items: [...depths.entries()]
      .filter(([, d]) => d === level)
      .map(([topicId]) => byId[topicId])
      .filter(keep),
    kind,
  }));
}

function tiersFor(scope: Scope, subject: Topic, keep: (t: Topic) => boolean): Tier[] {
  const subjectTier: Tier = { label: "Selected topic", items: [subject], kind: "subject" };

  if (scope === "chain") {
    const above = chainTiers(depthsFrom(subject.id, requiredBy), keep, "required", (level) =>
      level === 1 ? "Requires" : `Requires (${level} steps back)`
    );
    /* Furthest back first, so the read stays top to bottom. */
    return [...above.reverse(), subjectTier];
  }

  if (scope === "unlocks") {
    const below = chainTiers(depthsFrom(subject.id, unlockedBy), keep, "unlocked", (level) =>
      level === 1 ? "Unlocks" : `Unlocks (${level} steps on)`
    );
    return [subjectTier, ...below];
  }

  if (scope === "nearby") {
    return [subjectTier, { label: `Nearby in ${subject.category}`, items: nearbyTo(subject).filter(keep), kind: "nearby" }];
  }

  return localTiers(subject, keep);
}

export default function Workbench({
  initialId,
  scope: initialScope = "local",
  withHead = false,
}: {
  initialId?: string;
  scope?: Scope;
  /** Render the page heading for the active scope, on the standalone graph pages. */
  withHead?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [scope, setScope] = useState<Scope>(initialScope);
  const [selectedId, setSelectedId] = useState(
    initialId && byId[initialId] ? initialId : topics[0]?.id
  );

  const selected = byId[selectedId] ?? topics[0];

  /* Changing the subject or the scope is a change of state, not of page: the
     topic browser stays in place and the scroll position stays put. On the standalone
     graph pages the address is kept in step so the view can be shared and the
     back button still works. */
  const show = useCallback((id: string, next: Scope, push = true) => {
    setSelectedId(id);
    setScope(next);
    if (!push || typeof window === "undefined" || !window.location.pathname.startsWith("/graph/")) return;
    const route = SCOPES.find((s) => s.id === next)?.route ?? "show";
    window.history.pushState({ id, scope: next }, "", `/graph/${route}/${id}`);
  }, []);

  const select = useCallback((topic: Topic) => show(topic.id, scope), [show, scope]);

  useEffect(() => {
    const onPop = () => {
      const [, , route, id] = window.location.pathname.split("/");
      const found = SCOPES.find((s) => s.route === route);
      if (found && byId[id]) show(id, found.id, false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [show]);
  const needle = query.trim().toLowerCase();

  const matches = useCallback(
    (topic: Topic) =>
      (category === "All" || topic.category === category) &&
      (!needle || `${topic.title} ${topic.subtopic} ${topic.intro}`.toLowerCase().includes(needle)),
    [category, needle]
  );

  const shown = useMemo(() => topics.filter(matches), [matches]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Topic[]>();
    for (const topic of shown) {
      if (!groups.has(topic.category)) groups.set(topic.category, []);
      groups.get(topic.category)!.push(topic);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  /* The filter is for finding a notebook in the index. The diagram always
     shows the whole neighbourhood of the selected topic — a wire hidden
     by a search box would be a missing prerequisite, not a narrower view. */
  const tiers = useMemo(() => tiersFor(scope, selected, () => true), [scope, selected]);

  const neighbours = tiers.reduce((n, tier) => n + (tier.kind === "subject" ? 0 : tier.items.length), 0);
  const onPath = requiredBy(selected.id).length + unlockedBy(selected.id).length > 0;
  const curated = curatedIds.has(selected.id);
  const activeScope = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];

  useEffect(() => {
    if (withHead) document.title = `${activeScope.title} · ${selected.title}`;
  }, [withHead, activeScope, selected]);

  return (
    <>
    {withHead && (
      <section className="page-head">
        <h1>{activeScope.title}</h1>
        <p className="lead">{activeScope.lead}</p>
      </section>
    )}
    <section className="topic-browser" aria-label="Topic browser">
      <div className="topic-browser-bar">
        <label className="field">
          <SearchIcon />
          <span className="sr-only">Filter notebooks by name or subject</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${topics.length} notebooks`}
            aria-describedby="topic-count"
          />
        </label>
        <div className="seg" role="group" aria-label="Limit to a category">
          {["All", ...CATEGORIES].map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="topic-browser-body">
        <nav className="topic-browser-index" aria-label="Notebook index">
          <p className="rule-label">
            Index
            <span className="data" id="topic-count">
              {shown.length} / {topics.length}
            </span>
          </p>
          {shown.length ? (
            <div className="index-scroll">
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="index-group">
                    {group} · {items.length}
                  </p>
                  <ul className="index-list">
                    {items.map((topic) => (
                      <li key={topic.id}>
                        <button
                          type="button"
                          aria-pressed={topic.id === selected.id}
                          onClick={() => show(topic.id, scope)}
                        >
                          <b>{topic.title}</b>
                          <span className="data">{topic.difficulty}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Nothing matches “{query.trim()}”</h3>
              <p>
                {category === "All"
                  ? "Try a shorter word — the filter reads titles, subjects and notebook openings."
                  : `No ${category} notebook matches. Clear the category to search all ${topics.length}.`}
              </p>
              <ul>
                {topics.slice(0, 3).map((topic) => (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setCategory("All");
                        show(topic.id, scope);
                      }}
                    >
                      {topic.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="topic-browser-main">
          <article className="selected-topic">
            <p className="rule-label">Selected topic</p>
            <h2>{selected.title}</h2>
            <div className="selected-topic-meta">
              <span className={`cat cat-${categoryKey(selected.category)}`}>{selected.category}</span>
              <span className="data">
                {selected.subtopic} · {selected.difficulty}
              </span>
            </div>
            {/* The one action on the page comes before the prose, and is the
                only button-shaped thing in the card. */}
            <div className="actions">
              <a className="button-primary button-hero" href={`/topics/${selected.id}`}>
                Open the notebook
                <ArrowIcon />
              </a>
            </div>
            <p className="selected-topic-summary">
              {readableIntro(selected.intro)}
              {!curated && (
                <span
                  className="data excerpt-tag"
                  tabIndex={0}
                  role="note"
                  aria-label="Opening lines quoted from the notebook itself. A written summary for this notebook is still outstanding."
                  data-tip="Opening lines quoted from the notebook itself. A written summary for this notebook is still outstanding."
                >
                  excerpt
                </span>
              )}
            </p>
          </article>

          <section className="diagram-region" aria-labelledby="diagram-heading">
            <p className="rule-label" id="diagram-heading">
              {activeScope.panel}
              {onPath && (
                <span className="rule-links">
                  <a className="link-control" href={`/graph?focus=${selected.id}`}>
                    <ArrowIcon />
                    Show on the map
                  </a>
                </span>
              )}
            </p>
            <div className="scope">
              {SCOPES.map((item) => (
                <a
                  key={item.id}
                  href={`/graph/${item.route}/${selected.id}`}
                  aria-current={item.id === scope ? "page" : undefined}
                  onClick={(event) => {
                    if (plainClick(event)) {
                      event.preventDefault();
                      show(selected.id, item.id);
                    }
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
            {/* One diagram instance for every scope. Swapping components on a
                tab change unmounted it, the region collapsed for a frame while
                the new one measured itself, and the page scroll was clamped
                back up with it. */}
            <DependencyDiagram
              tiers={tiers}
              idPrefix="topic-browser"
              caption={activeScope.caption(selected.title)}
              grouped
              showLinks={scope === "chain" || scope === "unlocks"}
              onSelect={select}
            />

            {/* A chain view with nothing in it is not an unmapped topic — a
                root has no prerequisites and a leaf unlocks nothing, and the
                diagram already says so. The note is for a notebook that no
                path reaches at all. */}
            {neighbours === 0 && (scope === "nearby" || !onPath) && (
              <div className="diagram-note">
                <h3>{scope === "nearby" ? `Nothing else in ${selected.category} yet` : "Not on a path yet"}</h3>
                {scope !== "nearby" && (
                  <div className="actions">
                    <a className="button-ghost" href="/admin">
                      Propose a path
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
    </>
  );
}
