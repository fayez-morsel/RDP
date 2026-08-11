import test from "node:test";
import assert from "node:assert/strict";
import {
  addEvidence,
  clampSignedUrlExpiry,
  createShareGrant,
  migrateLegacySkill,
  prerequisitesMet,
  revokeShareGrant,
  settleMasteryTrial,
  sharedEvidence,
  updateReadiness,
  validateAttachment,
} from "../app/skills/mastery-engine.ts";
import { addSkillXpCommand } from "../app/progression-engine.ts";

test("legacy skill migration preserves all practice XP and levels", () => {
  const profile = migrateLegacySkill("frontend", 760, 8);
  assert.equal(profile.practiceXp, 760);
  assert.equal(profile.legacyLevel, 8);
  assert.equal(profile.masteryTier, "Unverified");
});

test("readiness can change without altering practice or mastery", () => {
  const profile = { ...migrateLegacySkill("frontend", 760, 8), masteryTier: "Demonstrated" };
  const changed = updateReadiness(profile, 21);
  assert.equal(changed.readiness, 21);
  assert.equal(changed.practiceXp, 760);
  assert.equal(changed.masteryTier, "Demonstrated");
});

test("evidence is private by default and grants no progression", () => {
  const profile = migrateLegacySkill("frontend", 760, 8);
  const next = addEvidence(profile, { id: "e1", kind: "reflection", title: "Reflection", private: true, verified: false, createdAt: "2026-08-11" });
  assert.equal(next.evidence[0].private, true);
  assert.equal(next.practiceXp, 760);
  assert.equal(next.masteryTier, "Unverified");
});

test("attachment validation enforces type, size, and sanitized names", () => {
  assert.equal(validateAttachment({ name: "secret.exe", type: "application/x-msdownload", size: 100 }).ok, false);
  assert.equal(validateAttachment({ name: "huge.pdf", type: "application/pdf", size: 9 * 1024 * 1024 }).ok, false);
  const valid = validateAttachment({ name: "Project Notes (final).pdf", type: "application/pdf", size: 1024 });
  assert.deepEqual(valid, { ok: true, sanitizedName: "Project-Notes-final-.pdf" });
});

test("signed evidence access is always short-lived", () => {
  assert.equal(clampSignedUrlExpiry(10), 30);
  assert.equal(clampSignedUrlExpiry(120), 120);
  assert.equal(clampSignedUrlExpiry(3_600), 300);
  assert.equal(clampSignedUrlExpiry(Number.NaN), 120);
});

test("mastery trials require verified evidence and settle exactly once", () => {
  const base = migrateLegacySkill("frontend", 760, 8);
  const profile = {
    ...base,
    evidence: [{ id: "verified", kind: "result", title: "Result", private: true, verified: true, createdAt: "2026-08-11" }],
    criteria: [{ id: "criterion", title: "Show result", required: true, satisfied: true, evidenceIds: ["verified"] }],
  };
  const first = settleMasteryTrial(profile, "attempt-1");
  assert.equal(first.settled, true);
  assert.equal(first.profile.masteryTier, "Foundation");
  const duplicate = settleMasteryTrial(first.profile, "attempt-1");
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.profile.masteryTier, "Foundation");
  const missing = settleMasteryTrial({ ...base, criteria: [{ id: "c", title: "Missing", required: true, satisfied: true, evidenceIds: ["none"] }] }, "attempt-2");
  assert.equal(missing.settled, false);
});

test("mentor and portfolio grants reveal only selected evidence and revoke immediately", () => {
  const evidence = [
    { id: "a", kind: "url", title: "A", private: false, verified: true, createdAt: "2026-08-11" },
    { id: "b", kind: "reflection", title: "B", private: true, verified: false, createdAt: "2026-08-11" },
  ];
  const grant = createShareGrant(["a"], "unpredictable-token");
  assert.deepEqual(sharedEvidence(grant, evidence).map((item) => item.id), ["a"]);
  assert.deepEqual(sharedEvidence(revokeShareGrant(grant, "2026-08-11"), evidence), []);
});

test("skill prerequisites explain every missing mastery requirement", () => {
  assert.deepEqual(prerequisitesMet("advanced", { advanced: ["foundation", "practice"] }, ["foundation"]), ["practice"]);
});

test("practice XP rewards are idempotent for the same authoritative source", () => {
  const state = {
    version: 1,
    profile: {}, progression: {}, attributes: [], quests: [], habits: [], achievements: [], inventory: [], claimedRewardIds: [],
    loadout: { boostIds: [] }, preferences: {}, skillNodes: {}, analyticsRange: "Last 30 days",
    skills: [{ id: "frontend-development", name: "Front-End Development", xp: 760, level: 8 }],
    activity: [], pendingProgressionEvents: [],
  };
  const first = addSkillXpCommand(state, "frontend-development", 100, "quest-event-1", "2026-08-11T12:00:00Z");
  assert.equal(first.ok, true);
  const second = addSkillXpCommand(first.state, "frontend-development", 100, "quest-event-1", "2026-08-11T12:01:00Z");
  assert.equal(second.ok, false);
  assert.equal(second.code, "duplicate");
  assert.equal(first.state.skills.find((skill) => skill.id === "frontend-development").xp, 860);
});
