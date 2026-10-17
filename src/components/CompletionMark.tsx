import { CheckIcon } from "./Icon";

export default function CompletionMark({ completed = false, topicId }: { completed?: boolean; topicId?: string }) {
  return <span className="completion-mark" hidden={!completed} data-topic-completion={topicId}>
    <CheckIcon />
    <span className="sr-only">Completed</span>
  </span>;
}
