import type { DayRecord } from "./data";

export type ReviewAction = "carry" | "rescope" | "schedule" | "pause" | "archive";
export type ReviewItem = {
  id: string;
  title: string;
  plannedMinutes: number;
  actualMinutes: number;
  status: "completed" | "unfinished";
  action?: ReviewAction;
};
export type Insight = {
  id: string;
  statement: string;
  dateRange: string;
  sampleSize: number;
  inputs: string[];
  calculation: string;
  caution: string;
};
export type ExperimentObservation = {
  date: string;
  phase: "baseline" | "experiment";
  value: number;
  contextTags?: string[];
};

const dateKeyInZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

/** Date-only arithmetic keeps week boundaries stable through daylight-saving transitions. */
export function weekRange(date: Date, timeZone: string, weekStartsOn = 1) {
  const localKey = dateKeyInZone(date, timeZone);
  const localNoon = new Date(`${localKey}T12:00:00Z`);
  const day = localNoon.getUTCDay();
  const offset = (day - weekStartsOn + 7) % 7;
  const start = new Date(localNoon);
  start.setUTCDate(start.getUTCDate() - offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    timeZone,
  };
}

export function plannedVsActual(items: ReviewItem[]) {
  const planned = items.reduce((sum, item) => sum + Math.max(0, item.plannedMinutes), 0);
  const actual = items.reduce((sum, item) => sum + Math.max(0, item.actualMinutes), 0);
  return {
    planned,
    actual,
    difference: actual - planned,
    accuracyPercent: planned ? Math.round((actual / planned) * 100) : 0,
  };
}

export function applyReviewAction(items: ReviewItem[], id: string, action: ReviewAction) {
  return items.map((item) => item.id === id && item.status === "unfinished" ? { ...item, action } : item);
}

export function recoverySummary(records: DayRecord[]) {
  const recovered = records.filter((record) => record.consistency === 2).length;
  const partial = records.filter((record) => record.consistency === 1).length;
  const recoveryDays = records.filter((record) => record.consistency === 0 && record.productiveMinutes < 90).length;
  return { recovered, partial, recoveryDays, total: records.length };
}

export function generateInsights(records: DayRecord[], declaredWeeklyCapacity: number): Insight[] {
  if (!records.length) return [];
  const first = records[0].date;
  const last = records[records.length - 1].date;
  const range = `${first}–${last}`;
  const shortDays = records.filter((record) => record.productiveMinutes <= 90);
  const longDays = records.filter((record) => record.productiveMinutes > 90);
  const completionRate = (items: DayRecord[]) => items.length ? Math.round(items.filter((item) => item.quests > 0).length / items.length * 100) : 0;
  const planned = records.reduce((sum, record) => sum + record.productiveMinutes, 0);
  const capacityForRange = Math.round(declaredWeeklyCapacity * records.length / 7);
  const shortRate = completionRate(shortDays);
  const longRate = completionRate(longDays);
  return [
    {
      id: "duration-completion",
      statement: `Days with 90 minutes or less of tracked work had quest completion on ${shortRate}% of days, compared with ${longRate}% on longer days.`,
      dateRange: range,
      sampleSize: records.length,
      inputs: ["Productive minutes", "Daily quest completion count"],
      calculation: `${shortDays.filter((day) => day.quests > 0).length}/${shortDays.length || 0} shorter days versus ${longDays.filter((day) => day.quests > 0).length}/${longDays.length || 0} longer days.`,
      caution: records.length < 14 ? "Small sample: treat this as a prompt to observe, not a conclusion." : "This is an association in your records, not evidence that duration caused completion.",
    },
    {
      id: "capacity-load",
      statement: planned > capacityForRange ? `You recorded ${planned - capacityForRange} minutes beyond your declared capacity in this range.` : `Your recorded time stayed ${capacityForRange - planned} minutes within declared capacity.`,
      dateRange: range,
      sampleSize: records.length,
      inputs: ["Recorded productive minutes", "Declared weekly capacity"],
      calculation: `${planned} recorded minutes minus ${capacityForRange} capacity-adjusted minutes.`,
      caution: "Recorded time can be incomplete; confirm your logs before changing next week's plan.",
    },
  ];
}

export function compareExperiment(observations: ExperimentObservation[]) {
  const average = (phase: ExperimentObservation["phase"]) => {
    const values = observations.filter((item) => item.phase === phase).map((item) => item.value);
    return { count: values.length, average: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0 };
  };
  const baseline = average("baseline");
  const experiment = average("experiment");
  return {
    baseline,
    experiment,
    difference: Math.round((experiment.average - baseline.average) * 10) / 10,
    caution: Math.min(baseline.count, experiment.count) < 5 ? "Small sample. This descriptive comparison does not establish cause and effect." : "Descriptive comparison only; other context may explain the difference.",
  };
}
