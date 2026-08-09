import type { Quest } from "./player-store";

export type Dependency = { questId: string; prerequisiteQuestId: string };
export function hasDependencyCycle(dependencies: Dependency[]) {
  const edges = new Map<string, string[]>(); dependencies.forEach(({ questId, prerequisiteQuestId }) => edges.set(prerequisiteQuestId, [...(edges.get(prerequisiteQuestId) ?? []), questId]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); if ((edges.get(id) ?? []).some(visit)) return true; visiting.delete(id); visited.add(id); return false; };
  return [...edges.keys()].some(visit);
}
export function eligibleCampaignQuests(quests: Quest[], dependencies: Dependency[]) { const completed = new Set(quests.filter(quest => quest.status === "completed").map(quest => quest.id)); return quests.filter(quest => quest.status === "active" && dependencies.filter(edge => edge.questId === quest.id).every(edge => completed.has(edge.prerequisiteQuestId))); }
export function forecastWeeks(remainingMinutes: number, weeklyCapacity: number, weeksAvailable: number) { if (remainingMinutes <= 0) return { weeks: 0, atRisk: false }; const safeCapacity = Math.max(1, weeklyCapacity); const weeks = Math.ceil(remainingMinutes / safeCapacity); return { weeks, atRisk: weeksAvailable > 0 && weeks > weeksAvailable }; }
