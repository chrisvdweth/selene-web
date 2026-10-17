import paths from "../data/learning-paths.json";
import { byId } from "./topics";

export type LearningPath = (typeof paths)[number];

export function pathLessons(path: LearningPath): string[] {
  return path.stages.flatMap((stage) => stage.lessons).filter((id) => byId[id]);
}

export function pathsForTopic(topicId: string): LearningPath[] {
  return paths.filter((path) => pathLessons(path).includes(topicId));
}

export function pathContext(topicId: string, pathId: string | null) {
  const path = pathsForTopic(topicId).find((item) => item.id === pathId);
  if (!path) return null;
  const lessons = pathLessons(path);
  const index = lessons.indexOf(topicId);
  return { path, index, total: lessons.length, previous: lessons[index - 1], next: lessons[index + 1] };
}

export function firstUnfinished(path: LearningPath, completed: ReadonlySet<string>): string | undefined {
  return pathLessons(path).find((id) => !completed.has(id));
}

export function pathNotebookUrl(topicId: string, pathId: string): string {
  return `/topics/${encodeURIComponent(topicId)}?path=${encodeURIComponent(pathId)}`;
}
