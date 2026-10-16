import { useEffect, useMemo, useState } from "react";
import CompletionMark from "./CompletionMark";
import paths from "../data/learning-paths.json";
import { byId } from "../lib/topics";
import { completedTopics, deviceId } from "../lib/device-progress";

const SELECTION_KEY = "selene-home-path";

type LearningPathsProps = { switcher?: boolean };

export default function LearningPaths({ switcher = false }: LearningPathsProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const [activePath, setActivePath] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (switcher) {
      try {
        const saved = sessionStorage.getItem(SELECTION_KEY);
        if (paths.some((path) => path.id === saved)) setActivePath(saved!);
      } catch {
        // Leave paths unselected when session storage is unavailable.
      }
    }
    setReady(true);
    deviceId();
    const sync = () => setCompleted(completedTopics());
    sync();
    window.addEventListener("selene-progress-change", sync);
    return () => window.removeEventListener("selene-progress-change", sync);
  }, [switcher]);

  const progress = useMemo(
    () => new Map(paths.map((path) => {
      const lessons = path.stages.flatMap((stage) => stage.lessons).filter((id) => byId[id]);
      return [path.id, { lessons, completed: lessons.filter((id) => completed.has(id)).length }];
    })),
    [completed]
  );

  return (
    <div className={switcher && ready ? "path-switcher" : "path-list"}>
      {switcher && ready && <aside className="path-sidebar" aria-label="Choose a learner path">
        <div className="path-sidebar-heading"><h2>Learner paths</h2><span className="data">{paths.length}</span></div>
        <div className="path-index">
          {paths.map((path) => {
            const state = progress.get(path.id)!;
            return <button type="button" key={path.id}
              aria-pressed={activePath === path.id}
              aria-controls={path.id}
              onClick={() => {
                setActivePath(path.id);
                try { sessionStorage.setItem(SELECTION_KEY, path.id); }
                catch { /* Path selection still works without session storage. */ }
              }}>
              <strong>{path.title}</strong>
              <span className="data">{state.completed} / {state.lessons.length} complete</span>
            </button>;
          })}
        </div>
      </aside>}
      {switcher && ready && !activePath && <section className="learning-path path-empty" aria-labelledby="path-empty-heading">
        <h2 id="path-empty-heading">Select a learner path to explore</h2>
        <p>Choose a path from the list to see its stages, lessons, and your progress.</p>
      </section>}
      {paths.map((path) => {
        const state = progress.get(path.id)!;
        return <section className="learning-path" id={path.id} key={path.id} hidden={switcher && ready && activePath !== path.id}
          aria-labelledby={`${path.id}-title`}>
          <header>
            <div>
              <h2 id={`${path.id}-title`}>{path.title}</h2>
              <p>{path.description}</p>
            </div>
            <p className="data" aria-label={`${state.completed} of ${state.lessons.length} notebooks complete`}>
              {state.completed} / {state.lessons.length} complete
            </p>
          </header>
          <ol>
            {path.stages.map((stage, index) => {
              const stageComplete = stage.lessons.every((id) => completed.has(id));
              return <li className={stageComplete ? "is-complete" : undefined} key={stage.title}>
                <div>
                  <span className="data">Stage {index + 1}</span>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
                <ul>
                  {stage.lessons.map((id) => byId[id] && <li key={id}>
                    <a href={`/topics/${id}`}>
                      <span className="lesson-title">{byId[id].title}<CompletionMark completed={completed.has(id)} /></span>
                      <span className="data">{byId[id].difficulty}</span>
                    </a>
                  </li>)}
                </ul>
              </li>;
            })}
          </ol>
        </section>;
      })}
    </div>
  );
}
