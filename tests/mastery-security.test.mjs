import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202608110008_evidence_mastery.sql", import.meta.url), "utf8");

test("private storage policies scope every object path to the authenticated owner", () => {
  assert.match(sql, /bucket_id='skill-evidence'.*storage\.foldername\(name\).*auth\.uid\(\)/s);
  assert.match(sql, /evidence owners read/);
  assert.match(sql, /evidence owners upload/);
  assert.match(sql, /evidence owners delete/);
});

test("mastery settlement is authenticated, locked, criteria-gated, and idempotent", () => {
  assert.match(sql, /settle_mastery_trial/);
  assert.match(sql, /security\.require_authenticated_user\(\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /settlement_key/);
  assert.match(sql, /required criteria need verified evidence/i);
});

test("mentor access requires matching identity and explicit evidence IDs", () => {
  assert.match(sql, /auth\.jwt\(\)->>'email'/);
  assert.match(sql, /v_email<>v_invitation\.invited_email/);
  assert.match(sql, /evidence\.id=any\(v_invitation\.evidence_ids\)/);
  assert.match(sql, /revoked_at is null and expires_at>now\(\)/);
});

test("portfolio tokens are hashed, opt-in, expirable, and revocable", () => {
  assert.match(sql, /digest\(v_token,'sha256'\)/);
  assert.match(sql, /evidence\.visibility='portfolio'/);
  assert.match(sql, /share\.expires_at is null or share\.expires_at>now\(\)/);
  assert.match(sql, /revoke_portfolio_share/);
});

test("practice awards are unique per authoritative event and skill", () => {
  assert.match(sql, /primary key\(event_id,skill_id\)/);
  assert.match(sql, /if new\.type<>'quest_completed'/);
  assert.match(sql, /on conflict do nothing/);
});
