export type LeaderboardCategory = "Overall Score" | "Quests" | "Habit Consistency" | "Skill Mastery" | "Achievements" | "Current Streak";

export type Player = {
  id: number;
  name: string;
  title: string;
  level: number;
  rank: string;
  score: number;
  quests: number;
  streak: number;
  badge: string;
  movement: number;
  habitConsistency: number;
  skillMastery: number;
  achievements: number;
  skillHighlights: string[];
  publicAchievements: string[];
  history: number[];
};

export const categories: LeaderboardCategory[] = ["Overall Score", "Quests", "Habit Consistency", "Skill Mastery", "Achievements", "Current Streak"];
export const scopes = ["Personal best", "Allies", "Guild", "Season"] as const;

export const players: Player[] = [
  { id: 1, name: "Ari Voss", title: "Solar Architect", level: 28, rank: "A", score: 18420, quests: 312, streak: 41, badge: "Dawnforged", movement: 2, habitConsistency: 97, skillMastery: 91, achievements: 38, skillHighlights: ["Systems", "Leadership"], publicAchievements: ["Dawnforged", "Iron Calendar", "First Light"], history: [4, 3, 3, 2, 1, 1] },
  { id: 2, name: "Mira Sol", title: "Mind Cartographer", level: 26, rank: "A", score: 17680, quests: 284, streak: 35, badge: "Sage", movement: 1, habitConsistency: 94, skillMastery: 96, achievements: 34, skillHighlights: ["Research", "Design"], publicAchievements: ["Sage", "Deep Work", "Archive Key"], history: [5, 4, 3, 3, 2, 2] },
  { id: 3, name: "Kian Vale", title: "Iron Will", level: 25, rank: "B", score: 16910, quests: 255, streak: 29, badge: "Unbroken", movement: -1, habitConsistency: 99, skillMastery: 83, achievements: 31, skillHighlights: ["Fitness", "Focus"], publicAchievements: ["Unbroken", "Peak Form", "Steadfast"], history: [2, 2, 1, 2, 2, 3] },
  { id: 8, name: "Nova Rook", title: "Signal Hunter", level: 21, rank: "B", score: 14860, quests: 211, streak: 23, badge: "Pulse", movement: 3, habitConsistency: 91, skillMastery: 85, achievements: 26, skillHighlights: ["Writing", "Strategy"], publicAchievements: ["Pulse", "Signal Found"], history: [11, 9, 8, 7, 5, 4] },
  { id: 17, name: "Fayez", title: "Awakened Developer", level: 12, rank: "E", score: 11420, quests: 84, streak: 12, badge: "Pathfinder", movement: 4, habitConsistency: 84, skillMastery: 76, achievements: 18, skillHighlights: ["Development", "Focus"], publicAchievements: ["Pathfinder", "First Commit", "Learning Loop"], history: [28, 25, 23, 21, 19, 17] },
  { id: 24, name: "Sera Quinn", title: "Bloom Keeper", level: 11, rank: "E", score: 10140, quests: 78, streak: 18, badge: "Rooted", movement: 1, habitConsistency: 92, skillMastery: 68, achievements: 15, skillHighlights: ["Wellness", "Learning"], publicAchievements: ["Rooted", "Kindred"], history: [35, 31, 28, 26, 25, 24] },
];
