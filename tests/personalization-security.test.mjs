import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = (
  await readFile(
    new URL(
      "../supabase/migrations/202608110012_personalization_privacy_trust.sql",
      import.meta.url,
    ),
    "utf8",
  )
).toLowerCase();

const tables = [
  "user_experience_preferences",
  "user_locale_preferences",
  "notification_preferences",
  "notification_delivery_log",
  "privacy_consents",
  "data_deletion_requests",
  "progression_adjustment_events",
];

test("personalization and privacy tables are protected by row-level security", () => {
  for (const table of tables) {
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
  }
});

test("deletion requests require recent re-authentication and remain recoverable", () => {
  assert.match(sql, /reauthenticated_at/);
  assert.match(sql, /interval '14 days'/);
  assert.match(sql, /cancel_data_deletion/);
  assert.match(sql, /status='cancelled'/);
});

test("progress changes are corrected through linked service events, never edits", () => {
  assert.match(sql, /record_progression_adjustment/);
  assert.match(sql, /original_event_id/);
  assert.match(sql, /adjustment_reason/);
  assert.match(
    sql,
    /grant execute[^;]+record_progression_adjustment[^;]+service_role/,
  );
  assert.match(sql, /'progression_'\|\|adjustment_kind/);
  assert.doesNotMatch(
    sql,
    /create policy[^;]+progression_adjustment_events[^;]+for update/,
  );
});
