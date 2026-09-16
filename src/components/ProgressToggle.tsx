import { useEffect, useState } from "react";
import { completedTopics, deviceId, setTopicCompleted } from "../lib/device-progress";

export default function ProgressToggle({ topicId }: { topicId: string }) {
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    deviceId();
    const sync = () => setComplete(completedTopics().has(topicId));
    sync();
    window.addEventListener("selene-progress-change", sync);
    return () => window.removeEventListener("selene-progress-change", sync);
  }, [topicId]);
  return <button className="button-ghost" type="button" aria-pressed={complete} onClick={() => {
    const next = !complete;
    setComplete(next);
    setTopicCompleted(topicId, next);
  }}>{complete ? "Mark as not completed" : "Mark as completed"}</button>;
}
