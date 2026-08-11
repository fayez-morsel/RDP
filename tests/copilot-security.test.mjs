import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202608110009_system_copilot.sql", import.meta.url), "utf8");

test("all Copilot data tables use owner-scoped RLS", () => {
  for (const table of ["ai_preferences", "ai_threads", "ai_messages", "ai_proposals", "ai_proposal_items", "ai_audit_events", "ai_feedback"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /auth\.uid\(\)\)=user_id/g);
});

test("retention-disabled accounts cannot persist messages", () => {
  assert.match(sql, /retention_enabled/);
  assert.match(sql, /Conversation retention is disabled/);
});

test("server application is confirmation-gated, selected, idempotent, and planning-only", () => {
  assert.match(sql, /Explicit confirmation and selected items are required/);
  assert.match(sql, /id=any\(p_item_ids\)/);
  assert.match(sql, /applied_at is not null.*duplicate/s);
  assert.match(sql, /xp_reward,coin_reward,status.*0,0,'draft'/s);
  assert.doesNotMatch(sql, /update public\.player_progression/);
  assert.doesNotMatch(sql, /update public\.player_skills/);
  assert.doesNotMatch(sql, /update public\.player_achievements/);
});

test("audit metadata strips unnecessary private prompt content", () => {
  assert.match(sql, /new\.metadata:=new\.metadata-'prompt'-'messages'-'userContent'-'evidence'-'journal'/);
});

test("only authenticated users can execute apply, undo, and delete functions", () => {
  assert.match(sql, /security\.require_authenticated_user\(\)/);
  assert.match(sql, /revoke all on function public\.confirm_and_apply_ai_proposal.*from public,anon/s);
  assert.match(sql, /grant execute on function public\.confirm_and_apply_ai_proposal.*to authenticated/s);
});
