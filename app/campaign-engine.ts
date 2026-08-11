import type { Quest } from "./player-store";

export type Dependency = { questId: string; prerequisiteQuestId: string };
export type CampaignQuest = {
  id: string;
  title: string;
  estimatedMinutes: number;
  status: "locked" | "available" | "completed" | "archived";
};
export type BossState = {
  healthTotal: number;
  healthRemaining: number;
  rewarded: boolean;
  contributionIds: string[];
};

export function hasDependencyCycle(dependencies: Dependency[]) {
  const edges = new Map<string, string[]>();
  for (const { questId, prerequisiteQuestId } of dependencies) {
    edges.set(prerequisiteQuestId, [
      ...(edges.get(prerequisiteQuestId) ?? []),
      questId,
    ]);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((edges.get(id) ?? []).some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...new Set([...edges.keys(), ...dependencies.map((item) => item.questId)])].some(visit);
}

export function addDependency(
  dependencies: Dependency[],
  dependency: Dependency,
) {
  if (dependency.questId === dependency.prerequisiteQuestId) {
    return { ok: false as const, message: "A quest cannot depend on itself." };
  }
  const next = dependencies.some(
    (item) =>
      item.questId === dependency.questId &&
      item.prerequisiteQuestId === dependency.prerequisiteQuestId,
  )
    ? dependencies
    : [...dependencies, dependency];
  if (hasDependencyCycle(next)) {
    return { ok: false as const, message: "That link would create a circular dependency." };
  }
  return { ok: true as const, dependencies: next };
}

export function remainingPrerequisites(
  questId: string,
  quests: Array<Pick<CampaignQuest, "id" | "title" | "status">>,
  dependencies: Dependency[],
) {
  const completed = new Set(
    quests.filter((quest) => quest.status === "completed").map((quest) => quest.id),
  );
  return dependencies
    .filter((edge) => edge.questId === questId && !completed.has(edge.prerequisiteQuestId))
    .map((edge) => quests.find((quest) => quest.id === edge.prerequisiteQuestId)?.title)
    .filter((title): title is string => Boolean(title));
}

export function unlockCampaignQuests(
  quests: CampaignQuest[],
  dependencies: Dependency[],
) {
  return quests.map((quest) => {
    if (quest.status !== "locked") return quest;
    return remainingPrerequisites(quest.id, quests, dependencies).length === 0
      ? { ...quest, status: "available" as const }
      : quest;
  });
}

export function eligibleCampaignQuests(
  quests: Quest[],
  dependencies: Dependency[],
) {
  const completed = new Set(
    quests.filter((quest) => quest.status === "completed").map((quest) => quest.id),
  );
  return quests.filter(
    (quest) =>
      quest.status === "active" &&
      dependencies
        .filter((edge) => edge.questId === quest.id)
        .every((edge) => completed.has(edge.prerequisiteQuestId)),
  );
}

export function forecastWeeks(
  remainingMinutes: number,
  weeklyCapacity: number,
  weeksAvailable: number,
) {
  if (remainingMinutes <= 0) return { weeks: 0, atRisk: false };
  const safeCapacity = Math.max(1, weeklyCapacity);
  const weeks = Math.ceil(remainingMinutes / safeCapacity);
  return { weeks, atRisk: weeksAvailable > 0 && weeks > weeksAvailable };
}

export function forecastCampaign(
  quests: CampaignQuest[],
  weeklyCapacity: number,
  targetDate?: string,
  today = new Date(),
) {
  const remainingMinutes = quests
    .filter((quest) => quest.status !== "completed" && quest.status !== "archived")
    .reduce((total, quest) => total + Math.max(0, quest.estimatedMinutes), 0);
  const target = targetDate ? new Date(`${targetDate}T23:59:59`) : null;
  const weeksAvailable = target
    ? Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 604_800_000))
    : 0;
  return { remainingMinutes, weeksAvailable, ...forecastWeeks(remainingMinutes, weeklyCapacity, weeksAvailable) };
}

/** Boss contribution is deterministic and idempotent. Reward settlement only flips once. */
export function contributeToBoss(
  boss: BossState,
  contributionId: string,
  requestedAmount: number,
) {
  if (boss.contributionIds.includes(contributionId)) {
    return { boss, amount: 0, duplicate: true, rewardSettled: false };
  }
  if (boss.healthRemaining <= 0 || requestedAmount <= 0) {
    return { boss, amount: 0, duplicate: false, rewardSettled: false };
  }
  const amount = Math.min(1000, Math.floor(requestedAmount), boss.healthRemaining);
  const healthRemaining = boss.healthRemaining - amount;
  const rewardSettled = healthRemaining === 0 && !boss.rewarded;
  return {
    amount,
    duplicate: false,
    rewardSettled,
    boss: {
      ...boss,
      healthRemaining,
      rewarded: boss.rewarded || rewardSettled,
      contributionIds: [...boss.contributionIds, contributionId],
    },
  };
}
