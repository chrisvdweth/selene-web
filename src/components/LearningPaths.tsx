import { useEffect, useMemo, useState } from "react";
import paths from "../data/learning-paths.json";
import { byId } from "../lib/topics";
import { completedTopics, deviceId } from "../lib/device-progress";

type LearningPathsProps = { overview?: boolean };

export default function LearningPaths({ overview = false }: LearningPathsProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
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

  if (overview) {
    return (
      <section className="path-overview" aria-labelledby="paths-heading">
        <div className="path-overview-heading">
          <div>
            <h2 id="paths-heading">Start with a learner path</h2>
            <p>Choose a structured route, then mark each notebook complete as you work.</p>
          </div>
          <a className="link-control" href="/paths">View all learner paths</a>
        </div>
        <ul>
          {paths.map((path) => {
            const state = progress.get(path.id)!;
            return <li key={path.id}>
              <a href={`/paths#${path.id}`}>
                <span>
                  <b>{path.title}</b>
                  <span>{path.description}</span>
                </span>
                <span className="data">{state.completed} / {state.lessons.length} complete</span>
              </a>
            </li>;
          })}
        </ul>
      </section>
    );
  }

  return (
    <div className="path-list">
      {paths.map((path) => {
        const state = progress.get(path.id)!;
        return <section className="learning-path" id={path.id} key={path.id} aria-labelledby={`${path.id}-title`}>
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
