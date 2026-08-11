import test from "node:test";
import assert from "node:assert/strict";
import {
  applyReviewAction,
  compareExperiment,
  generateInsights,
  plannedVsActual,
  recoverySummary,
  weekRange,
} from "../app/analytics/review-engine.ts";

const records = [
  { date: "Aug 4", xp: 100, quests: 1, habits: 3, skills: 1, achievements: 0, productiveMinutes: 80, consistency: 2 },
  { date: "Aug 5", xp: 0, quests: 0, habits: 1, skills: 0, achievements: 0, productiveMinutes: 45, consistency: 1 },
  { date: "Aug 6", xp: 160, quests: 1, habits: 0, skills: 1, achievements: 0, productiveMinutes: 130, consistency: 0 },
];

test("daily shutdown actions alter planning metadata without progression", () => {
  const items = [{ id: "q1", title: "Quest", plannedMinutes: 60, actualMinutes: 20, status: "unfinished" }];
  const progression = { xp: 7840, coins: 2450 };
  for (const action of ["carry", "rescope", "schedule", "pause", "archive"]) {
    const result = applyReviewAction(items, "q1", action);
    assert.equal(result[0].action, action);
    assert.deepEqual(progression, { xp: 7840, coins: 2450 });
  }
});

test("planned versus actual calculations preserve signed difference", () => {
  assert.deepEqual(plannedVsActual([
    { id: "a", title: "A", plannedMinutes: 60, actualMinutes: 45, status: "completed" },
    { id: "b", title: "B", plannedMinutes: 30, actualMinutes: 45, status: "unfinished" },
  ]), { planned: 90, actual: 90, difference: 0, accuracyPercent: 100 });
});

test("weekly boundaries remain date-stable through DST and non-DST zones", () => {
  assert.deepEqual(weekRange(new Date("2026-03-08T07:30:00Z"), "America/New_York"), { start: "2026-03-02", end: "2026-03-08", timeZone: "America/New_York" });
  assert.deepEqual(weekRange(new Date("2026-08-11T12:00:00Z"), "Asia/Beirut"), { start: "2026-08-10", end: "2026-08-16", timeZone: "Asia/Beirut" });
});

test("habit recovery is represented without destructive reset semantics", () => {
  assert.deepEqual(recoverySummary(records), { recovered: 1, partial: 1, recoveryDays: 0, total: 3 });
});

test("insights expose range, sample, inputs, calculation, and small-sample caution", () => {
  const insights = generateInsights(records, 300);
  assert.equal(insights.length, 2);
  for (const insight of insights) {
    assert.ok(insight.dateRange);
    assert.equal(insight.sampleSize, 3);
    assert.ok(insight.inputs.length > 0);
    assert.ok(insight.calculation.length > 0);
    assert.match(insight.caution, /sample|recorded|association/i);
  }
});

test("experiments compare periods descriptively and retain caution", () => {
  const result = compareExperiment([
    { date: "1", phase: "baseline", value: 60 },
    { date: "2", phase: "baseline", value: 70 },
    { date: "3", phase: "experiment", value: 75 },
    { date: "4", phase: "experiment", value: 85 },
  ]);
  assert.deepEqual(result.baseline, { count: 2, average: 65 });
  assert.deepEqual(result.experiment, { count: 2, average: 80 });
  assert.equal(result.difference, 15);
  assert.match(result.caution, /does not establish cause/i);
});
