export const scoringRules = [
  { label: "Verified quests", detail: "XP is awarded once per completed objective." },
  { label: "Habit consistency", detail: "Daily streak points are capped after the fifth check-in." },
  { label: "Skill practice", detail: "Only focused sessions longer than 15 minutes count." },
];

export const actionCaps = { easyQuestPerDay: 3, habitPointsPerDay: 120, focusMinutesPerDay: 240 } as const;
