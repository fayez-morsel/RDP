import test from "node:test";
import assert from "node:assert/strict";
import {
  addDependency,
  contributeToBoss,
  forecastCampaign,
  forecastWeeks,
  hasDependencyCycle,
  remainingPrerequisites,
  unlockCampaignQuests,
} from "../app/campaign-engine.ts";
import { rankPrimeQuests } from "../app/daily-engine.ts";

const quests = [
  { id: "a", title: "First", estimatedMinutes: 60, status: "completed" },
  { id: "b", title: "Second", estimatedMinutes: 90, status: "locked" },
  { id: "c", title: "Third", estimatedMinutes: 150, status: "locked" },
];
const dependencies = [
  { questId: "b", prerequisiteQuestId: "a" },
  { questId: "c", prerequisiteQuestId: "b" },
];

test("campaign dependencies reject direct and transitive cycles", () => {
  assert.equal(hasDependencyCycle([{ questId: "b", prerequisiteQuestId: "a" }, { questId: "a", prerequisiteQuestId: "b" }]), true);
  const result = addDependency(dependencies, { questId: "a", prerequisiteQuestId: "c" });
  assert.equal(result.ok, false);
});

test("completing prerequisites unlocks dependents but not later quests", () => {
  const unlocked = unlockCampaignQuests(quests, dependencies);
  assert.equal(unlocked.find((quest) => quest.id === "b").status, "available");
  assert.equal(unlocked.find((quest) => quest.id === "c").status, "locked");
  assert.deepEqual(remainingPrerequisites("c", unlocked, dependencies), ["Second"]);
});

test("campaign forecast is deterministic and updates with capacity", () => {
  assert.deepEqual(forecastWeeks(300, 100, 2), { weeks: 3, atRisk: true });
  const slow = forecastCampaign(quests, 100, "2026-08-25", new Date("2026-08-11T00:00:00Z"));
  const fast = forecastCampaign(quests, 300, "2026-08-25", new Date("2026-08-11T00:00:00Z"));
  assert.equal(slow.weeks, 3);
  assert.equal(fast.weeks, 1);
  assert.equal(slow.remainingMinutes, 240);
});

test("boss contribution and reward settlement occur exactly once", () => {
  const initial = { healthTotal: 100, healthRemaining: 40, rewarded: false, contributionIds: [] };
  const first = contributeToBoss(initial, "event-1", 50);
  assert.equal(first.amount, 40);
  assert.equal(first.rewardSettled, true);
  const duplicate = contributeToBoss(first.boss, "event-1", 50);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.amount, 0);
  assert.equal(duplicate.rewardSettled, false);
});

test("daily recommendations exclude locked campaign quests", () => {
  const playerQuests = [
    { id: "a", title: "First", description: "", category: "Career", type: "Daily", difficulty: "Easy", xp: 10, progress: 100, deadline: "Today", objectives: [{ id: "a1", label: "done", done: true }], status: "completed" },
    { id: "b", title: "Second", description: "", category: "Career", type: "Daily", difficulty: "Easy", xp: 10, progress: 0, deadline: "Today", objectives: [{ id: "b1", label: "open", done: false }], status: "active" },
    { id: "c", title: "Third", description: "", category: "Career", type: "Daily", difficulty: "Easy", xp: 10, progress: 0, deadline: "Today", objectives: [{ id: "c1", label: "open", done: false }], status: "active" },
  ];
  const ranked = rankPrimeQuests(playerQuests, { minutes: 60, energy: 5, focus: 5, mode: "Balanced" }, dependencies);
  assert.deepEqual(ranked.map((item) => item.quest.id), ["b"]);
});
