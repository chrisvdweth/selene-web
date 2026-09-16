const DEVICE_KEY = "selene-device-id";
const COMPLETED_KEY = "selene-completed-topics";

export function deviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const identifier = crypto.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, identifier);
  return identifier;
}

export function completedTopics(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? "[]")); }
  catch { return new Set(); }
}

export function setTopicCompleted(id: string, completed: boolean): Set<string> {
  const ids = completedTopics();
  if (completed) ids.add(id); else ids.delete(id);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...ids].sort()));
  window.dispatchEvent(new Event("selene-progress-change"));
  return ids;
}
