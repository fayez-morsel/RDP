"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addSkillXpCommand, claimAchievementCommand, completeHabitCommand, completeQuestCommand, type CommandResult } from "./progression-engine";

export type ISODate = string;
export type PlayerProfile = { id: string; displayName: string; username: string; avatar: string | null; title: string; bio: string; memberSince: ISODate };
export type Progression = { level: number; rank: string; league: string; xp: number; nextLevelXp: number; attributePoints: number; coins: number; keys: number };
export type PlayerAttribute = { id: string; name: string; value: number; xp: number; level: number };
export type Quest = { id: string; title: string; description: string; category: string; type: "Daily" | "Weekly" | "Main Quests" | "Side Quests"; difficulty: "Easy" | "Medium" | "Hard" | "Legendary"; xp: number; coins?: number; progress: number; deadline: string; objectives: { id: string; label: string; done: boolean }[]; status: "active" | "completed" | "draft" | "expired"; completedAt?: ISODate };
export type Habit = { id: string; name: string; goal: string; period: "Morning" | "Afternoon" | "Evening" | "Anytime"; attribute: string; difficulty: "Easy" | "Medium" | "Hard"; xp: number; streak: number; progress: number; status: "Pending" | "In Progress" | "Completed" | "Skipped" | "Missed"; completedDates: ISODate[] };
export type Skill = { id: string; name: string; xp: number; level: number };
export type Achievement = { id: string; name: string; category: "Progression" | "Quests" | "Habits" | "Skills"; rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic"; progress: number; score: number; status: "locked" | "unlocked"; claimed: boolean; unlockedAt?: ISODate; featured?: boolean };
export type InventoryItem = { id: string; name: string; kind: string; rarity: string; quantity: number; equipped?: boolean };
export type PlayerLoadout = { titleId?: string; frameId?: string; themeId?: string; boostIds: string[] };
export type PlayerPreferences = { publicRanking: boolean; showAvatar: boolean; showRank: boolean; shareAchievements: boolean; shareSkills: boolean; shareQuests: boolean; shareHabits: boolean };
export type ActivityEvent = { id: string; type: string; occurredAt: ISODate; route: string; sourceId?: string; metadata?: Record<string, unknown> };
export type SkillNodeProgress = { level: number; xp: number; status: "locked" | "available" | "unlocked" | "progress" | "mastered" };

export type PlayerState = {
  version: 1; profile: PlayerProfile; progression: Progression; attributes: PlayerAttribute[];
  quests: Quest[]; habits: Habit[]; skills: Skill[]; achievements: Achievement[];
  inventory: InventoryItem[]; loadout: PlayerLoadout; preferences: PlayerPreferences; skillNodes: Record<string, SkillNodeProgress>;
  activity: ActivityEvent[]; pendingProgressionEvents: ActivityEvent[]; claimedRewardIds: string[]; analyticsRange: "Last 7 days" | "Last 30 days" | "Last 90 days" | "This year" | "Custom date range";
};

export const playerStorageKey = "lifequest.player.v1";
export const rpgConfig = {
  levelXpRequirements: [0, 500, 1200, 2200, 3500, 5000, 6800, 8800, 11000, 13500],
  rankThresholds: [{ rank: "E", minimumXp: 0 }, { rank: "D", minimumXp: 10000 }, { rank: "C", minimumXp: 25000 }, { rank: "B", minimumXp: 50000 }, { rank: "A", minimumXp: 90000 }],
  attributeDefinitions: ["Strength", "Intelligence", "Discipline", "Creativity", "Focus", "Communication"],
  skillCategories: ["Intelligence", "Discipline", "Creativity", "Health", "Social"],
  achievementRequirements: { common: 1, rare: 7, epic: 25, legendary: 30, mythic: 5 },
  inventoryRarities: ["Common", "Rare", "Epic", "Legendary", "Mythic"],
  leagues: ["Initiate I", "Vanguard III", "Ascendant I", "Paragon"],
} as const;
const attributeSeeds = [["strength", "Strength", 72, 720, 7], ["intelligence", "Intelligence", 86, 860, 8], ["discipline", "Discipline", 79, 790, 7], ["creativity", "Creativity", 68, 680, 6], ["focus", "Focus", 82, 820, 8], ["communication", "Communication", 61, 610, 6]] as const;
export const defaultPlayerPreferences: PlayerPreferences = { publicRanking: false, showAvatar: true, showRank: false, shareAchievements: false, shareSkills: false, shareQuests: false, shareHabits: false };

export const initialPlayerState: PlayerState = {
  version: 1,
  profile: { id: "player-fayez", displayName: "Fayez", username: "fayez", avatar: null, title: "Awakened Developer", bio: "Building a stronger life, one verified quest at a time.", memberSince: "2026-06-01" },
  progression: { level: 12, rank: "E", league: "Vanguard III", xp: 7840, nextLevelXp: 10000, attributePoints: 3, coins: 2450, keys: 3 },
  attributes: attributeSeeds.map(([id, name, value, xp, level]) => ({ id, name, value, xp, level })),
  quests: [
    { id: "workout", title: "Complete a 30-minute workout", description: "Build strength with a full-body circuit.", category: "Fitness", type: "Daily", difficulty: "Medium", xp: 180, coins: 35, progress: 67, deadline: "3h 20m left", objectives: [{ id: "warm-up", label: "Warm up for five minutes", done: true }, { id: "circuit", label: "Complete 3 circuit rounds", done: true }, { id: "recovery", label: "Stretch and log recovery", done: false }], status: "active" },
    { id: "react-study", title: "Study React for 60 minutes", description: "Practice component composition and document one pattern.", category: "Learning", type: "Daily", difficulty: "Hard", xp: 240, coins: 50, progress: 33, deadline: "6h 45m left", objectives: [{ id: "review", label: "Review Server Component notes", done: true }, { id: "build", label: "Build a practice component", done: false }, { id: "summary", label: "Write a learning summary", done: false }], status: "active" },
    { id: "portfolio", title: "Finish the portfolio case study", description: "Turn your strongest product story into a clear case study.", category: "Career", type: "Main Quests", difficulty: "Legendary", xp: 1200, coins: 280, progress: 58, deadline: "Due in 5 days", objectives: [{ id: "outline", label: "Outline the narrative arc", done: true }, { id: "research", label: "Refine the research evidence", done: true }, { id: "publish", label: "Publish final visual treatment", done: false }], status: "active" },
    { id: "hydration", title: "Drink eight glasses of water", description: "Maintain hydration through the afternoon recovery window.", category: "Health", type: "Daily", difficulty: "Easy", xp: 80, progress: 75, deadline: "Today", objectives: [{ id: "six-glasses", label: "Drink 6 glasses", done: true }, { id: "last-glasses", label: "Drink 2 more glasses", done: false }], status: "active" },
    { id: "job-applications", title: "Apply to three job opportunities", description: "Choose roles that align with your product and design mission.", category: "Career", type: "Weekly", difficulty: "Hard", xp: 480, coins: 110, progress: 33, deadline: "Due Sunday", objectives: [{ id: "shortlist", label: "Shortlist aligned roles", done: true }, { id: "tailor", label: "Tailor two applications", done: false }, { id: "send", label: "Send final application", done: false }], status: "active" },
    { id: "reading", title: "Read 20 pages", description: "Continue your current non-fiction expedition before the evening reset.", category: "Personal Growth", type: "Side Quests", difficulty: "Easy", xp: 90, progress: 100, deadline: "Completed today", objectives: [{ id: "read", label: "Read 20 pages", done: true }], status: "completed", completedAt: "2026-06-14" },
  ], habits: [
    { id: "morning-hydration", name: "Morning Hydration", goal: "Drink 2 glasses of water", period: "Morning", attribute: "Vitality", difficulty: "Easy", xp: 40, streak: 12, progress: 100, status: "Completed", completedDates: ["2026-06-14"] },
    { id: "focused-coding", name: "Focused Coding", goal: "Complete 60 minutes of coding", period: "Morning", attribute: "Intelligence", difficulty: "Hard", xp: 200, streak: 8, progress: 50, status: "In Progress", completedDates: [] },
    { id: "daily-movement", name: "Daily Movement", goal: "Exercise for 30 minutes", period: "Afternoon", attribute: "Strength", difficulty: "Medium", xp: 150, streak: 5, progress: 100, status: "Completed", completedDates: ["2026-06-14"] },
    { id: "knowledge-acquisition", name: "Knowledge Acquisition", goal: "Read 15 pages", period: "Afternoon", attribute: "Intelligence", difficulty: "Medium", xp: 100, streak: 9, progress: 100, status: "Completed", completedDates: ["2026-06-14"] },
    { id: "deep-work-protocol", name: "Deep Work Protocol", goal: "Complete one 45-minute distraction-free session", period: "Evening", attribute: "Focus", difficulty: "Hard", xp: 180, streak: 6, progress: 35, status: "In Progress", completedDates: [] },
    { id: "sleep-recovery", name: "Sleep Recovery", goal: "Sleep for at least 7 hours", period: "Anytime", attribute: "Vitality", difficulty: "Medium", xp: 120, streak: 11, progress: 0, status: "Pending", completedDates: [] },
  ], skills: [{ id: "frontend-development", name: "Front-End Development", xp: 760, level: 8 }, { id: "ui-ux-design", name: "UI/UX Design", xp: 640, level: 7 }, { id: "project-management", name: "Project Management", xp: 480, level: 5 }], achievements: [
    { id: "first-awakening", name: "First Awakening", category: "Progression", rarity: "Common", progress: 100, score: 100, status: "unlocked", claimed: true, unlockedAt: "2026-06-02" },
    { id: "seven-day-awakening", name: "Seven-Day Awakening", category: "Habits", rarity: "Rare", progress: 100, score: 350, status: "unlocked", claimed: false, unlockedAt: "2026-06-09" },
    { id: "unbreakable-discipline", name: "Unbreakable Discipline", category: "Habits", rarity: "Legendary", progress: 100, score: 1000, status: "unlocked", claimed: false, unlockedAt: "2026-06-14" },
    { id: "quest-hunter", name: "Quest Hunter", category: "Quests", rarity: "Epic", progress: 88, score: 600, status: "locked", claimed: false },
    { id: "master-of-many", name: "Master of Many", category: "Skills", rarity: "Mythic", progress: 40, score: 1600, status: "locked", claimed: false },
  ],
  inventory: [
    { id: "xp", name: "Double XP Core", kind: "Boosters", rarity: "Epic", quantity: 2 }, { id: "shield", name: "Streak Shield", kind: "Consumables", rarity: "Rare", quantity: 1 },
    { id: "focus", name: "Focus Crystal", kind: "Boosters", rarity: "Common", quantity: 4 }, { id: "title", name: "Disciplined Hunter", kind: "Titles", rarity: "Legendary", quantity: 1, equipped: true },
    { id: "frame", name: "Ascension Frame", kind: "Profile Frames", rarity: "Legendary", quantity: 1 }, { id: "theme", name: "System Blue", kind: "Themes", rarity: "Rare", quantity: 1 },
    { id: "key", name: "Quest Key", kind: "Collectibles", rarity: "Epic", quantity: 3 }, { id: "fragment", name: "Awakening Fragment", kind: "Collectibles", rarity: "Mythic", quantity: 1 },
  ],
  loadout: { titleId: "title", boostIds: ["xp"] }, preferences: defaultPlayerPreferences, skillNodes: {}, activity: [], pendingProgressionEvents: [], claimedRewardIds: [], analyticsRange: "Last 30 days",
};

const cloneInitial = (): PlayerState => JSON.parse(JSON.stringify(initialPlayerState)) as PlayerState;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const mergeState = (raw: unknown): PlayerState | null => {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.profile) || !isRecord(raw.progression)) return null;
  const source = raw as Partial<PlayerState>;
  return {
    ...cloneInitial(), ...source, version: 1,
    profile: { ...initialPlayerState.profile, ...source.profile },
    progression: { ...initialPlayerState.progression, ...source.progression },
    attributes: Array.isArray(source.attributes) ? source.attributes : cloneInitial().attributes,
    quests: Array.isArray(source.quests) && source.quests.length ? [...source.quests, ...initialPlayerState.quests.filter(seed => !source.quests!.some(quest => quest.id === seed.id))] : cloneInitial().quests,
    habits: Array.isArray(source.habits) && source.habits.length ? source.habits : cloneInitial().habits,
    skills: Array.isArray(source.skills) && source.skills.length ? source.skills : cloneInitial().skills,
    achievements: Array.isArray(source.achievements) && source.achievements.length ? source.achievements : cloneInitial().achievements,
    inventory: Array.isArray(source.inventory) && source.inventory.length ? source.inventory.filter(item => item.quantity >= 0) : cloneInitial().inventory,
    loadout: isRecord(source.loadout) ? { ...initialPlayerState.loadout, ...source.loadout, boostIds: Array.isArray(source.loadout.boostIds) ? source.loadout.boostIds : [] } : { boostIds: [] },
    preferences: isRecord(source.preferences) ? { ...defaultPlayerPreferences, ...source.preferences } : defaultPlayerPreferences, skillNodes: isRecord(source.skillNodes) ? source.skillNodes as Record<string, SkillNodeProgress> : {},
    activity: Array.isArray(source.activity) ? source.activity : [], pendingProgressionEvents: Array.isArray(source.pendingProgressionEvents) ? source.pendingProgressionEvents : [], claimedRewardIds: Array.isArray(source.claimedRewardIds) ? source.claimedRewardIds : [],
  };
};

export const selectXpProgress = (state: PlayerState) => state.progression.nextLevelXp > 0 ? state.progression.xp / state.progression.nextLevelXp : 0;
export const selectQuestTotals = (state: PlayerState) => ({ total: state.quests.length, completed: state.quests.filter(q => q.status === "completed").length });
export const selectHabitSummary = (state: PlayerState) => { const completed = state.habits.filter(habit => habit.status === "Completed"); return { total: state.habits.length, completed: completed.length, consistency: state.habits.length ? Math.round(completed.length / state.habits.length * 100) : 0, longestStreak: Math.max(0, ...state.habits.map(habit => habit.streak)) }; };
export const selectAchievementTotals = (state: PlayerState) => ({ total: state.achievements.length, unlocked: state.achievements.filter(a => a.status === "unlocked").length });
export const selectEquippedItems = (state: PlayerState) => state.inventory.filter(item => item.equipped);
export const selectPlayerAnalytics = (state: PlayerState) => ({ events: state.activity, xpAwarded: state.activity.filter(event => event.type === "xp_awarded").reduce((total, event) => total + Number(event.metadata?.amount ?? 0), 0), questsCompleted: state.activity.filter(event => event.type === "quest_completed").length, habitsCompleted: state.activity.filter(event => event.type === "habit_completed").length, achievementsClaimed: state.activity.filter(event => event.type === "reward_claimed").length });
export const selectLeaderboardScore = (state: PlayerState) => { const analytics = selectPlayerAnalytics(state); return state.progression.xp + analytics.questsCompleted * 25 + analytics.habitsCompleted * 10 + analytics.achievementsClaimed * 100; };

type Store = {
  state: PlayerState; hydrated: boolean;
  updateProfile: (patch: Partial<PlayerProfile>) => void; updatePreferences: (patch: Partial<PlayerPreferences>) => void; setAnalyticsRange: (range: PlayerState["analyticsRange"]) => void; completeHabit: (id: string, date?: ISODate) => CommandResult; addSkillXp: (skillId: string, amount: number, sourceId: string) => CommandResult; updateQuestObjective: (questId: string, objectiveId: string) => boolean; completeQuest: (id: string) => CommandResult;
  evolveSkillNode: (nodeId: string, skillId: string, amount: number, progress: SkillNodeProgress) => CommandResult;
  addQuest: (quest: Omit<Quest, "id" | "status"> & { status?: Quest["status"] }) => string; deleteQuest: (id: string) => boolean;
  updateQuestPlanning: (id: string, patch: Partial<Pick<Quest, "title" | "description" | "deadline" | "status">>) => boolean;
  allocate: (attributeId: string, points: number) => boolean; addInventory: (item: InventoryItem) => void; consumeInventory: (id: string) => boolean;
  equipInventory: (id: string) => boolean; unlockAchievement: (id: string) => boolean; claimAchievement: (id: string) => boolean; claimReward: (rewardId: string) => boolean; recordActivity: (event: ActivityEvent) => boolean;
};
const Context = createContext<Store | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>(initialPlayerState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(playerStorageKey); const restored = raw ? mergeState(JSON.parse(raw)) : null;
        if (restored) setState(restored);
        else if (raw) window.localStorage.removeItem(playerStorageKey);
        else { const legacyAvatar = window.localStorage.getItem("lifequest.avatar"); if (legacyAvatar) setState(current => ({ ...current, profile: { ...current.profile, avatar: legacyAvatar } })); }
      }
      catch { window.localStorage.removeItem(playerStorageKey); }
      finally { setHydrated(true); }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(playerStorageKey, JSON.stringify(state)); }, [hydrated, state]);
  const value = useMemo<Store>(() => ({
    state, hydrated,
    updateProfile: patch => setState(current => ({ ...current, profile: { ...current.profile, ...patch } })),
    updatePreferences: patch => setState(current => ({ ...current, preferences: { ...current.preferences, ...patch } })),
    setAnalyticsRange: analyticsRange => setState(current => ({ ...current, analyticsRange })),
    completeHabit: (id, date) => { const result = completeHabitCommand(state, id, date); if (result.ok) setState(result.state); return result; },
    addSkillXp: (skillId, amount, sourceId) => { const result = addSkillXpCommand(state, skillId, amount, sourceId); if (result.ok) setState(result.state); return result; },
    evolveSkillNode: (nodeId, skillId, amount, progress) => { const result = addSkillXpCommand(state, skillId, amount, `skill-tree:${nodeId}`); if (result.ok) setState({ ...result.state, skillNodes: { ...result.state.skillNodes, [nodeId]: progress } }); return result; },
    updateQuestObjective: (questId, objectiveId) => { const quest = state.quests.find(entry => entry.id === questId); if (!quest || quest.status === "completed" || !quest.objectives.some(objective => objective.id === objectiveId)) return false; const objectives = quest.objectives.map(objective => objective.id === objectiveId ? { ...objective, done: !objective.done } : objective); const updatedQuest = { ...quest, objectives, progress: Math.round(objectives.filter(objective => objective.done).length / objectives.length * 100) }; if (objectives.length > 0 && objectives.every(objective => objective.done)) { const result = completeQuestCommand({ ...state, quests: state.quests.map(entry => entry.id === questId ? updatedQuest : entry) }, questId); if (result.ok) setState(result.state); return result.ok; } setState(current => ({ ...current, quests: current.quests.map(entry => entry.id === questId ? updatedQuest : entry) })); return true; },
    completeQuest: id => { const result = completeQuestCommand(state, id); if (result.ok) setState(result.state); return result; },
    addQuest: quest => { const id = `quest:${crypto.randomUUID()}`; setState(current => ({ ...current, quests: [{ ...quest, id, status: quest.status ?? "active" }, ...current.quests] })); return id; },
    deleteQuest: id => { const quest = state.quests.find(entry => entry.id === id); if (!quest || quest.status === "completed") return false; setState(current => ({ ...current, quests: current.quests.filter(entry => entry.id !== id) })); return true; },
    updateQuestPlanning: (id, patch) => { const quest = state.quests.find(entry => entry.id === id); if (!quest || quest.status === "completed" || patch.status === "completed") return false; const title = patch.title?.trim(); if (patch.title !== undefined && (!title || title.length > 160)) return false; setState(current => ({ ...current, quests: current.quests.map(entry => entry.id === id ? { ...entry, ...patch, ...(title ? { title } : {}) } : entry) })); return true; },
    allocate: (attributeId, points) => {
      if (!Number.isInteger(points) || points < 1 || points > state.progression.attributePoints || !state.attributes.some(attribute => attribute.id === attributeId)) return false;
      const occurredAt = new Date().toISOString(); const allocationEvent: ActivityEvent = { id: `attribute_milestone:${attributeId}:${occurredAt}`, type: "attribute_milestone", sourceId: attributeId, occurredAt, route: "/profile", metadata: { idempotencyKey: `attribute_allocation:${attributeId}:${occurredAt}`, points } };
      setState(current => ({ ...current, progression: { ...current.progression, attributePoints: current.progression.attributePoints - points }, attributes: current.attributes.map(attribute => attribute.id === attributeId ? { ...attribute, value: attribute.value + points } : attribute), activity: [allocationEvent, ...current.activity], pendingProgressionEvents: [allocationEvent, ...current.pendingProgressionEvents].slice(0, 30) })); return true;
    },
    addInventory: item => { if (item.quantity > 0) setState(current => { const existing = current.inventory.find(entry => entry.id === item.id); return { ...current, inventory: existing ? current.inventory.map(entry => entry.id === item.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry) : [...current.inventory, item] }; }); },
    consumeInventory: id => { const item = state.inventory.find(entry => entry.id === id); if (!item || item.quantity < 1) return false; const occurredAt = new Date().toISOString(); const useEvent: ActivityEvent = { id: `item_used:${id}:${occurredAt}`, type: "item_used", sourceId: id, occurredAt, route: "/inventory", metadata: { idempotencyKey: `item_used:${id}:${occurredAt}` } }; setState(current => ({ ...current, inventory: current.inventory.map(entry => entry.id === id ? { ...entry, quantity: entry.quantity - 1 } : entry), activity: [useEvent, ...current.activity], pendingProgressionEvents: [useEvent, ...current.pendingProgressionEvents].slice(0, 30) })); return true; },
    equipInventory: id => { const item = state.inventory.find(entry => entry.id === id); if (!item || item.quantity < 1) return false; const occurredAt = new Date().toISOString(); setState(current => ({ ...current, inventory: current.inventory.map(entry => entry.kind === item.kind ? { ...entry, equipped: entry.id === id ? !entry.equipped : false } : entry), activity: [{ id: `item_equipped:${id}:${occurredAt}`, type: "item_equipped", sourceId: id, occurredAt, route: "/inventory", metadata: { idempotencyKey: `item_equipped:${id}`, equipped: !item.equipped } }, ...current.activity], pendingProgressionEvents: [{ id: `item_equipped:${id}:${occurredAt}`, type: "item_equipped", sourceId: id, occurredAt, route: "/inventory", metadata: { idempotencyKey: `item_equipped:${id}`, equipped: !item.equipped } }, ...current.pendingProgressionEvents].slice(0, 30) })); return true; },
    unlockAchievement: id => { const achievement = state.achievements.find(entry => entry.id === id); if (!achievement || achievement.status === "unlocked") return false; const occurredAt = new Date().toISOString(); const unlockEvent: ActivityEvent = { id: `achievement_unlocked:${id}:${occurredAt}`, type: "achievement_unlocked", sourceId: id, occurredAt, route: "/achievements", metadata: { idempotencyKey: `achievement_unlocked:${id}` } }; setState(current => ({ ...current, achievements: current.achievements.map(entry => entry.id === id ? { ...entry, status: "unlocked", progress: 100, unlockedAt: occurredAt } : entry), activity: [unlockEvent, ...current.activity], pendingProgressionEvents: [unlockEvent, ...current.pendingProgressionEvents].slice(0, 30) })); return true; },
    claimAchievement: id => { const result = claimAchievementCommand(state, id); if (result.ok) setState(result.state); return result.ok; },
    claimReward: rewardId => { if (state.claimedRewardIds.includes(rewardId)) return false; setState(current => ({ ...current, claimedRewardIds: [...current.claimedRewardIds, rewardId] })); return true; },
    recordActivity: event => { if (state.activity.some(current => current.id === event.id || (event.sourceId && current.sourceId === event.sourceId && current.type === event.type))) return false; setState(current => ({ ...current, activity: [event, ...current.activity] })); return true; },
  }), [hydrated, state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const usePlayer = () => { const value = useContext(Context); if (!value) throw new Error("usePlayer must be used inside PlayerProvider"); return value; };
