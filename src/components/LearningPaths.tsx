import { useEffect, useMemo, useRef, useState } from "react";
import paths from "../data/learning-paths.json";
import { byId } from "../lib/topics";
import { completedTopics, deviceId } from "../lib/device-progress";

type LearningPathsProps = { switcher?: boolean };

export default function LearningPaths({ switcher = false }: LearningPathsProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const [activePath, setActivePath] = useState(paths[0].id);
  const [ready, setReady] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setReady(true);
    deviceId();
    const sync = () => setCompleted(completedTopics());
    sync();
    window.addEventListener("selene-progress-change", sync);
    return () => window.removeEventListener("selene-progress-change", sync);
  }, []);

  const progress = useMemo(
    () => new Map(paths.map((path) => {
      const lessons = path.stages.flatMap((stage) => stage.lessons).filter((id) => byId[id]);
      return [path.id, { lessons, completed: lessons.filter((id) => completed.has(id)).length }];
    })),
    [completed]
  );

  return (
    <div className={switcher ? "path-switcher" : "path-list"}>
      {switcher && ready && <div className="path-tabs" role="tablist" aria-label="Learner paths">
        {paths.map((path, index) => <button
          key={path.id}
          ref={(element) => { tabs.current[index] = element; }}
          type="button"
          role="tab"
          id={`${path.id}-tab`}
          aria-controls={path.id}
          aria-selected={activePath === path.id}
          tabIndex={activePath === path.id ? 0 : -1}
          onClick={() => setActivePath(path.id)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % paths.length;
            else if (event.key === "ArrowLeft") next = (index - 1 + paths.length) % paths.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = paths.length - 1;
            else return;
            event.preventDefault();
            setActivePath(paths[next].id);
            tabs.current[next]?.focus();
          }}
        >{path.title}</button>)}
      </div>}
      {paths.map((path) => {
        const state = progress.get(path.id)!;
        return <section className="learning-path" id={path.id} key={path.id} hidden={switcher && ready && activePath !== path.id}
          role={switcher && ready ? "tabpanel" : undefined}
          tabIndex={switcher && ready ? 0 : undefined}
          aria-labelledby={switcher && ready ? `${path.id}-tab` : `${path.id}-title`}>
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
                      <span>{byId[id].title}</span>
                      <span className="data">{completed.has(id) ? "Completed" : byId[id].difficulty}</span>
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
