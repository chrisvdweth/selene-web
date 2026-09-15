import DependencyDiagram, { type Tier } from "./DependencyDiagram";
import { requiredBy, unlockedBy, type Topic } from "../lib/topics";

/**
 * The local view of one topic: what it requires, and what it unlocks.
 *
 * Both neighbouring tiers are drawn as a single group, with one wire between
 * each group and the subject. This is the same picture wherever a topic is
 * looked at on its own — the topic browser and the notebook dossier share it.
 */

export function localTiers(subject: Topic, keep: (t: Topic) => boolean = () => true): Tier[] {
  return [
    { label: "Requires", items: requiredBy(subject.id).filter(keep), kind: "required" },
    { label: "Selected topic", items: [subject], kind: "subject" },
    { label: "Unlocks", items: unlockedBy(subject.id).filter(keep), kind: "unlocked" },
  ];
}

export default function LocalDependencies({
  subject,
  tiers,
  idPrefix,
  caption,
  onSelect,
}: {
  subject: Topic;
  /** Pre-filtered tiers, when the caller has already narrowed the neighbourhood. */
  tiers?: Tier[];
  idPrefix: string;
  caption?: string;
  onSelect?: (topic: Topic) => void;
}) {
  return (
    <DependencyDiagram
      tiers={tiers ?? localTiers(subject)}
      idPrefix={idPrefix}
      caption={caption ?? `Local dependencies of ${subject.title}: what it requires, and what it unlocks`}
      grouped
      onSelect={onSelect}
    />
  );
}
