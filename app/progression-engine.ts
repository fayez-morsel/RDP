import type { ActivityEvent, PlayerState } from "./player-store";

export type ProgressionEventType = "quest_completed" | "habit_completed" | "xp_awarded" | "level_up" | "rank_up" | "attribute_milestone" | "achievement_unlocked" | "reward_claimed" | "item_equipped";
export type CommandResult = { ok: true; state: PlayerState; events: ActivityEvent[] } | { ok: false; code: "not_found" | "already_completed" | "invalid" | "duplicate"; message: string };
const event = (type: ProgressionEventType, sourceId: string, occurredAt: string, route: string, metadata: Record<string, unknown> = {}): ActivityEvent => ({ id: `${type}:${sourceId}:${occurredAt}`, type, sourceId, occurredAt, route, metadata: { idempotencyKey: `${type}:${sourceId}`, ...metadata } });
const rankFor = (xp: number) => [{ rank: "A", minimumXp: 90000 }, { rank: "B", minimumXp: 50000 }, { rank: "C", minimumXp: 25000 }, { rank: "D", minimumXp: 10000 }, { rank: "E", minimumXp: 0 }].find(item => xp >= item.minimumXp)!;
const levelFor = (xp: number, fallback: number) => { const thresholds = [0, 500, 1200, 2200, 3500, 5000, 6800, 8800, 11000, 13500]; let level = fallback; for (let index = 0; index < thresholds.length; index += 1) if (xp >= thresholds[index]) level = Math.max(level, index + 1); return level; };
const withEvents = (state: PlayerState, events: ActivityEvent[]) => ({ ...state, activity: [...events, ...state.activity], pendingProgressionEvents: [...events, ...state.pendingProgressionEvents].slice(0, 30) });
const levelEvents = (sourceId: string, occurredAt: string, from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, index) => event("level_up", `${sourceId}:${from + index + 1}`, occurredAt, "/profile", { from: from + index, to: from + index + 1 }));
const unlockEligible = (state: PlayerState, at: string) => state.achievements.map(achievement => {
  if (achievement.status === "unlocked") return achievement;
  const questTotal = state.quests.filter(quest => quest.status === "completed").length;
  const shouldUnlock = achievement.id === "quest-hunter" ? questTotal >= 25 : achievement.id === "master-of-many" ? state.skills.filter(skill => skill.level >= 5).length >= 5 : false;
  return shouldUnlock ? { ...achievement, status: "unlocked" as const, progress: 100, unlockedAt: at } : achievement;
});
const achievementUnlockEvents = (before: PlayerState, after: PlayerState, occurredAt: string) => after.achievements
  .filter(achievement => achievement.status === "unlocked" && before.achievements.find(previous => previous.id === achievement.id)?.status !== "unlocked")
  .map(achievement => event("achievement_unlocked", achievement.id, occurredAt, "/achievements", { achievementId: achievement.id, rarity: achievement.rarity }));

export function completeQuestCommand(state: PlayerState, questId: string, occurredAt = new Date().toISOString()): CommandResult {
  const quest = state.quests.find(item => item.id === questId);
  if (!quest) return { ok: false, code: "not_found", message: "Quest was not found." };
  if (quest.status !== "active") return { ok: false, code: "already_completed", message: "This quest is no longer active." };
  if (state.activity.some(item => item.type === "quest_completed" && item.sourceId === questId)) return { ok: false, code: "duplicate", message: "Quest completion was already recorded." };
  const boost = state.loadout.boostIds.includes("xp") && state.inventory.some(item => item.id === "xp" && item.quantity > 0) ? 2 : 1;
  const awardedXp = Math.max(0, Math.round(quest.xp * boost)); const nextXp = state.progression.xp + awardedXp;
  const nextLevel = levelFor(nextXp, state.progression.level); const nextRank = rankFor(nextXp);
  const events = [event("quest_completed", questId, occurredAt, "/quests", { questId }), event("xp_awarded", questId, occurredAt, "/analytics", { amount: awardedXp, boost })];
  events.push(...levelEvents(questId, occurredAt, state.progression.level, nextLevel));
  if (nextRank.rank !== state.progression.rank) events.push(event("rank_up", questId, occurredAt, "/leaderboard", { from: state.progression.rank, to: nextRank.rank }));
  const attributes = state.attributes.map(attribute => attribute.name === (quest.category === "Fitness" ? "Strength" : quest.category === "Learning" ? "Intelligence" : "Focus") ? { ...attribute, xp: attribute.xp + Math.round(awardedXp / 4) } : attribute);
  const next = { ...state, progression: { ...state.progression, xp: nextXp, coins: state.progression.coins + Math.max(0, quest.coins ?? 0), level: nextLevel, rank: nextRank.rank, attributePoints: state.progression.attributePoints + Math.max(0, nextLevel - state.progression.level), nextLevelXp: [0, 500, 1200, 2200, 3500, 5000, 6800, 8800, 11000, 13500][nextLevel] ?? state.progression.nextLevelXp }, quests: state.quests.map(item => item.id === questId ? { ...item, status: "completed" as const, progress: 100, completedAt: occurredAt } : item), attributes, inventory: boost === 2 ? state.inventory.map(item => item.id === "xp" ? { ...item, quantity: item.quantity - 1 } : item) : state.inventory, loadout: boost === 2 ? { ...state.loadout, boostIds: state.loadout.boostIds.filter(id => id !== "xp") } : state.loadout };
  const completed = { ...next, achievements: unlockEligible(next, occurredAt) };
  events.push(...achievementUnlockEvents(state, completed, occurredAt));
  return { ok: true, state: withEvents(completed, events), events };
}

export function completeHabitCommand(state: PlayerState, habitId: string, occurredAt = new Date().toISOString()): CommandResult {
  const habit = state.habits.find(item => item.id === habitId); const occurrence = occurredAt.slice(0, 10);
  if (!habit) return { ok: false, code: "not_found", message: "Habit was not found." };
  if (habit.status === "Skipped" || habit.status === "Missed") return { ok: false, code: "invalid", message: "This occurrence cannot be completed." };
  if (habit.completedDates.includes(occurrence)) return { ok: false, code: "duplicate", message: "This habit occurrence already awarded XP." };
  const awardedXp = Math.max(0, habit.xp); const nextXp = state.progression.xp + awardedXp; const nextLevel = levelFor(nextXp, state.progression.level); const nextRank = rankFor(nextXp);
  const events = [event("habit_completed", `${habitId}:${occurrence}`, occurredAt, "/habits", { habitId, occurrence }), event("xp_awarded", `${habitId}:${occurrence}`, occurredAt, "/analytics", { amount: awardedXp })];
  events.push(...levelEvents(habitId, occurredAt, state.progression.level, nextLevel));
  if (nextRank.rank !== state.progression.rank) events.push(event("rank_up", habitId, occurredAt, "/leaderboard", { from: state.progression.rank, to: nextRank.rank }));
  const attributeName = habit.attribute === "Vitality" ? "Strength" : habit.attribute;
  const next = { ...state, progression: { ...state.progression, xp: nextXp, level: nextLevel, rank: nextRank.rank, attributePoints: state.progression.attributePoints + Math.max(0, nextLevel - state.progression.level), nextLevelXp: [0, 500, 1200, 2200, 3500, 5000, 6800, 8800, 11000, 13500][nextLevel] ?? state.progression.nextLevelXp }, habits: state.habits.map(item => item.id === habitId ? { ...item, status: "Completed" as const, progress: 100, streak: item.streak + 1, completedDates: [...item.completedDates, occurrence] } : item), attributes: state.attributes.map(attribute => attribute.name === attributeName ? { ...attribute, xp: attribute.xp + Math.round(awardedXp / 4) } : attribute) };
  const completed = { ...next, achievements: unlockEligible(next, occurredAt) };
  events.push(...achievementUnlockEvents(state, completed, occurredAt));
  return { ok: true, state: withEvents(completed, events), events };
}

export function addSkillXpCommand(state: PlayerState, skillId: string, amount: number, sourceId: string, occurredAt = new Date().toISOString()): CommandResult {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, code: "invalid", message: "Skill XP must be positive." };
  const skill = state.skills.find(item => item.id === skillId);
  if (!skill) return { ok: false, code: "not_found", message: "Skill was not found." };
  if (state.activity.some(item => item.type === "xp_awarded" && item.sourceId === sourceId)) return { ok: false, code: "duplicate", message: "This practice reward was already recorded." };
  const nextXp = skill.xp + Math.floor(amount); const nextLevel = Math.max(skill.level, Math.floor(nextXp / 500) + 1);
  const events = [event("xp_awarded", sourceId, occurredAt, "/skills", { skillId, amount: Math.floor(amount) })];
  if (nextLevel > skill.level) events.push(event("attribute_milestone", skillId, occurredAt, "/skills", { skillId, from: skill.level, to: nextLevel }));
  const next = { ...state, skills: state.skills.map(item => item.id === skillId ? { ...item, xp: nextXp, level: nextLevel } : item) };
  return { ok: true, state: withEvents(next, events), events };
}

export function claimAchievementCommand(state: PlayerState, achievementId: string, occurredAt = new Date().toISOString()): CommandResult {
  const achievement = state.achievements.find(item => item.id === achievementId);
  if (!achievement) return { ok: false, code: "not_found", message: "Achievement was not found." };
  if (achievement.status !== "unlocked") return { ok: false, code: "invalid", message: "This achievement is not unlocked yet." };
  if (achievement.claimed || state.claimedRewardIds.includes(achievementId)) return { ok: false, code: "duplicate", message: "This reward was already claimed." };
  const rewardId = `reward:${achievementId}`; const reward = { id: rewardId, name: `${achievement.name} Cache`, kind: "Collectibles", rarity: achievement.rarity, quantity: 1 };
  const existing = state.inventory.find(item => item.id === rewardId); const nextXp = state.progression.xp + 500; const nextLevel = levelFor(nextXp, state.progression.level); const nextRank = rankFor(nextXp);
  const events = [event("reward_claimed", achievementId, occurredAt, "/inventory", { achievementId, rewardId }), event("xp_awarded", achievementId, occurredAt, "/analytics", { amount: 500 })];
  events.push(...levelEvents(achievementId, occurredAt, state.progression.level, nextLevel));
  if (nextRank.rank !== state.progression.rank) events.push(event("rank_up", achievementId, occurredAt, "/leaderboard", { from: state.progression.rank, to: nextRank.rank }));
  return { ok: true, state: withEvents({ ...state, progression: { ...state.progression, xp: nextXp, coins: state.progression.coins + 100, level: nextLevel, rank: nextRank.rank, attributePoints: state.progression.attributePoints + Math.max(0, nextLevel - state.progression.level) }, achievements: state.achievements.map(item => item.id === achievementId ? { ...item, claimed: true } : item), claimedRewardIds: [...state.claimedRewardIds, achievementId], inventory: existing ? state.inventory.map(item => item.id === rewardId ? { ...item, quantity: item.quantity + 1 } : item) : [...state.inventory, reward] }, events), events };
}
