import type { Quest } from "./player-store";

export type DayMode = "Recovery" | "Balanced" | "Push";
export type DailyCheckIn = { minutes: number; energy: 1 | 2 | 3 | 4 | 5; focus: 1 | 2 | 3 | 4 | 5; mode: DayMode; note?: string };
export type RankedQuest = { quest: Quest; estimatedMinutes: number; score: number; reason: string; minimumVersion: boolean };

const minutesFor = (difficulty: Quest["difficulty"]) => ({ Easy: 20, Medium: 35, Hard: 60, Legendary: 90 })[difficulty];
const energyFor = (difficulty: Quest["difficulty"]) => ({ Easy: 1, Medium: 2, Hard: 3, Legendary: 4 })[difficulty];
const urgencyFor = (deadline: string) => /today|\d+h|tomorrow/i.test(deadline) ? 30 : /\d+ days|sunday/i.test(deadline) ? 14 : 4;

/** Pure, deterministic ranking: no LLM, random values, XP, or mutation. */
export function rankPrimeQuests(quests: Quest[], checkIn: DailyCheckIn): RankedQuest[] {
  return quests.filter(quest => quest.status === "active" && quest.progress < 100 && quest.objectives.some(objective => !objective.done)).map(quest => {
    const estimatedMinutes = minutesFor(quest.difficulty); const neededEnergy = energyFor(quest.difficulty);
    const energyFit = checkIn.energy >= neededEnergy ? 24 : -32; const capacityFit = estimatedMinutes <= checkIn.minutes ? 18 : -22;
    const inProgress = quest.progress > 0 ? 16 : 0; const importance = ({ Easy: 5, Medium: 11, Hard: 17, Legendary: 22 })[quest.difficulty];
    const minimumVersion = checkIn.mode === "Recovery" && (quest.difficulty === "Easy" || quest.progress > 0);
    const score = urgencyFor(quest.deadline) + energyFit + capacityFit + inProgress + importance + (minimumVersion ? 14 : 0);
    const reason = `${/today|\d+h/i.test(quest.deadline) ? "Due soon" : "Advances your active work"} · ${checkIn.energy >= neededEnergy ? "fits your current energy" : "needs more energy"} · ${minimumVersion ? "minimum version" : `${estimatedMinutes} minutes`}`;
    return { quest, estimatedMinutes, score, reason, minimumVersion };
  }).filter(item => item.score > 0).toSorted((a, b) => b.score - a.score || a.quest.title.localeCompare(b.quest.title)).slice(0, 3);
}

export function capacitySummary(items: RankedQuest[], minutes: number) { const planned = items.reduce((sum, item) => sum + item.estimatedMinutes, 0); return { planned, remaining: minutes - planned, exceeded: planned > minutes }; }
