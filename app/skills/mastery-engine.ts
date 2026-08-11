export type MasteryTier = "Unverified" | "Foundation" | "Demonstrated" | "Mastered";
export type EvidenceKind = "reflection" | "url" | "file" | "result" | "before-after" | "reference";
export type MasteryCriterion = {
  id: string;
  title: string;
  required: boolean;
  satisfied: boolean;
  evidenceIds: string[];
};
export type SkillEvidence = {
  id: string;
  kind: EvidenceKind;
  title: string;
  private: boolean;
  verified: boolean;
  createdAt: string;
};
export type MasteryProfile = {
  skillId: string;
  practiceXp: number;
  legacyLevel: number;
  readiness: number;
  masteryTier: MasteryTier;
  criteria: MasteryCriterion[];
  evidence: SkillEvidence[];
  settledAttemptIds: string[];
};
export type AttachmentCandidate = { name: string; type: string; size: number };

const allowedAttachmentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);
export const maxEvidenceBytes = 8 * 1024 * 1024;
export const clampSignedUrlExpiry = (seconds: number) => Math.max(30, Math.min(300, Math.floor(Number.isFinite(seconds) ? seconds : 120)));

/** Maps legacy XP/level without reducing either value or inventing mastery. */
export function migrateLegacySkill(skillId: string, xp: number, level: number): MasteryProfile {
  return {
    skillId,
    practiceXp: Math.max(0, xp),
    legacyLevel: Math.max(1, level),
    readiness: 50,
    masteryTier: "Unverified",
    criteria: [],
    evidence: [],
    settledAttemptIds: [],
  };
}

export function updateReadiness(profile: MasteryProfile, readiness: number) {
  return { ...profile, readiness: Math.max(0, Math.min(100, Math.round(readiness))) };
}

export function addEvidence(profile: MasteryProfile, evidence: SkillEvidence) {
  if (profile.evidence.some((item) => item.id === evidence.id)) return profile;
  return { ...profile, evidence: [...profile.evidence, { ...evidence, private: evidence.private !== false }] };
}

export function validateAttachment(file: AttachmentCandidate) {
  if (!allowedAttachmentTypes.has(file.type)) return { ok: false as const, message: "Use a JPG, PNG, WebP, PDF, or text file." };
  if (file.size <= 0 || file.size > maxEvidenceBytes) return { ok: false as const, message: "Evidence files must be between 1 byte and 8 MB." };
  const sanitizedName = file.name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);
  if (!sanitizedName || sanitizedName === ".") return { ok: false as const, message: "The file name is not valid." };
  return { ok: true as const, sanitizedName };
}

export function prerequisitesMet(skillId: string, prerequisites: Record<string, string[]>, masteredSkillIds: string[]) {
  const mastered = new Set(masteredSkillIds);
  return (prerequisites[skillId] ?? []).filter((id) => !mastered.has(id));
}

export function settleMasteryTrial(profile: MasteryProfile, attemptId: string) {
  if (profile.settledAttemptIds.includes(attemptId)) return { profile, duplicate: true, settled: false };
  const required = profile.criteria.filter((criterion) => criterion.required);
  const validEvidenceIds = new Set(profile.evidence.filter((evidence) => evidence.verified).map((evidence) => evidence.id));
  const ready = required.length > 0 && required.every((criterion) => criterion.satisfied && criterion.evidenceIds.some((id) => validEvidenceIds.has(id)));
  if (!ready) return { profile, duplicate: false, settled: false, message: "Required criteria need verified evidence." };
  const nextTier: MasteryTier = profile.masteryTier === "Unverified" ? "Foundation" : profile.masteryTier === "Foundation" ? "Demonstrated" : "Mastered";
  return { profile: { ...profile, masteryTier: nextTier, settledAttemptIds: [...profile.settledAttemptIds, attemptId] }, duplicate: false, settled: true };
}

export type ShareGrant = { token: string; evidenceIds: string[]; revokedAt?: string };
export function createShareGrant(evidenceIds: string[], token = crypto.randomUUID()) {
  return { token, evidenceIds: [...new Set(evidenceIds)] } satisfies ShareGrant;
}
export function revokeShareGrant(grant: ShareGrant, revokedAt = new Date().toISOString()) {
  return { ...grant, revokedAt };
}
export function sharedEvidence(grant: ShareGrant, evidence: SkillEvidence[]) {
  if (grant.revokedAt) return [];
  const allowed = new Set(grant.evidenceIds);
  return evidence.filter((item) => allowed.has(item.id));
}
