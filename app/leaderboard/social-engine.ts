export type ConnectionState = "pending" | "accepted" | "declined" | "blocked" | "removed";
export type VisibilityCategory = "habits" | "campaigns" | "milestones" | "focus_sessions" | "achievements" | "summary_metrics";
export type EncouragementKind = "cheer" | "respect" | "well_done";

export const privateVisibility = (): Record<VisibilityCategory, boolean> => ({ habits: false, campaigns: false, milestones: false, focus_sessions: false, achievements: false, summary_metrics: false });

export function transitionConnection(current: ConnectionState, action: "accept" | "decline" | "remove" | "block") {
  if (action === "block") return { state: "blocked" as const, visible: false, notificationsEnabled: false };
  if (current === "blocked") throw new Error("Blocked connections cannot be changed by the other player.");
  if (action === "accept" && current === "pending") return { state: "accepted" as const, visible: true, notificationsEnabled: true };
  if (action === "decline" && current === "pending") return { state: "declined" as const, visible: false, notificationsEnabled: false };
  if (action === "remove" && current === "accepted") return { state: "removed" as const, visible: false, notificationsEnabled: false };
  throw new Error(`Invalid connection transition: ${current} -> ${action}`);
}

const forbiddenSocialFields = new Set(["notes", "journal", "journal_entries", "evidence", "evidence_files", "calendar_events", "energy", "energy_checkins", "ai_conversations"]);

export function applyVisibility<T extends Record<string, unknown>>(snapshot: T, rules = privateVisibility()) {
  return Object.fromEntries(Object.entries(snapshot).filter(([key]) => !forbiddenSocialFields.has(key) && rules[key as VisibilityCategory] === true));
}

export type CommitmentResult = { ownerId: string; status: "complete" | "missed"; recoveryPrompt: string | null; progressionDelta: 0; affectedParticipantIds: string[] };
export function recordCommitment(ownerId: string, status: "complete" | "missed"): CommitmentResult {
  return { ownerId, status, recoveryPrompt: status === "missed" ? "Choose a smaller next action when you are ready." : null, progressionDelta: 0, affectedParticipantIds: [ownerId] };
}

export type BossState = { id: string; target: number; total: number; settled: boolean; contributions: Record<string, number>; eventIds: string[] };
export function contributeToBoss(boss: BossState, input: { participantId: string; eventId: string; verified: boolean; amount: number; participantCap: number }) {
  if (!input.verified || input.amount <= 0) return { boss, applied: false, rewardSettled: false };
  if (boss.eventIds.includes(input.eventId)) return { boss, applied: false, rewardSettled: false };
  const prior = boss.contributions[input.participantId] ?? 0;
  const appliedAmount = Math.max(0, Math.min(input.amount, input.participantCap - prior));
  if (!appliedAmount) return { boss, applied: false, rewardSettled: false };
  const total = boss.total + appliedAmount;
  const rewardSettled = !boss.settled && total >= boss.target;
  return { applied: true, appliedAmount, rewardSettled, boss: { ...boss, total, settled: boss.settled || rewardSettled, contributions: { ...boss.contributions, [input.participantId]: prior + appliedAmount }, eventIds: [...boss.eventIds, input.eventId] } };
}

export function leaveEncounter(boss: BossState, participantId: string) {
  return { boss, participantId, access: false, historicalContribution: boss.contributions[participantId] ?? 0 };
}

export function createFocusSession(input: { startsAt: string; durationMinutes: number; intention: string }) {
  if (![25, 50, 75].includes(input.durationMinutes)) throw new Error("Focus sessions must last 25, 50, or 75 minutes.");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error("A timezone-safe start time is required.");
  return { id: crypto.randomUUID(), startsAt: startsAt.toISOString(), durationMinutes: input.durationMinutes, intention: input.intention.trim().slice(0, 240), attendanceXp: 0 as const };
}

export function sendEncouragement(input: { kind: EncouragementKind; blocked: boolean; recentCount: number; limit?: number }) {
  if (input.blocked) throw new Error("Blocked players cannot contact each other.");
  if (input.recentCount >= (input.limit ?? 5)) throw new Error("Encouragement rate limit reached.");
  return { kind: input.kind, progressionDelta: 0 as const, deliverNotification: true };
}
