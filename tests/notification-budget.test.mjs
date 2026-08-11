import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDailyNotificationBudget,
  createDefaultNotificationBudget,
  isNotificationPaused,
  isWithinQuietHours,
  normalizeNotificationBudget,
} from "../app/notification-budget.ts";

test("notification defaults are calm, bounded, and honest about channels", () => {
  const preferences = createDefaultNotificationBudget("Asia/Beirut");
  assert.equal(preferences.dailyLimit, 4);
  assert.equal(preferences.bundled, true);
  assert.equal(preferences.timezone, "Asia/Beirut");
  for (const channels of Object.values(preferences.channels)) {
    assert.equal(channels.inApp, true);
    assert.equal(channels.push, false);
    assert.equal(channels.email, false);
  }
});

test("unsupported channels cannot be enabled through restored browser data", () => {
  const restored = normalizeNotificationBudget({
    dailyLimit: 99,
    channels: {
      rewards: { inApp: false, push: true, email: true },
    },
  });
  assert.equal(restored.dailyLimit, 12);
  assert.deepEqual(restored.channels.rewards, {
    inApp: false,
    push: false,
    email: false,
  });
});

test("the daily budget uses the selected timezone and suppresses paused delivery", () => {
  const now = new Date("2026-08-11T12:00:00Z");
  const preferences = {
    ...createDefaultNotificationBudget("UTC"),
    dailyLimit: 2,
  };
  const candidates = [
    { id: "1", createdAt: "2026-08-11T10:00:00Z" },
    { id: "2", createdAt: "2026-08-11T09:00:00Z" },
    { id: "3", createdAt: "2026-08-11T08:00:00Z" },
    { id: "old", createdAt: "2026-08-10T23:00:00Z" },
  ];
  assert.deepEqual(
    applyDailyNotificationBudget(candidates, preferences, now).map(
      (item) => item.id,
    ),
    ["1", "2"],
  );
  const paused = {
    ...preferences,
    pausedUntil: "2026-08-12T12:00:00Z",
  };
  assert.equal(isNotificationPaused(paused, now), true);
  assert.deepEqual(applyDailyNotificationBudget(candidates, paused, now), []);
});

test("overnight quiet hours follow the configured timezone", () => {
  const preferences = createDefaultNotificationBudget("UTC");
  assert.equal(
    isWithinQuietHours(preferences, new Date("2026-08-11T23:00:00Z")),
    true,
  );
  assert.equal(
    isWithinQuietHours(preferences, new Date("2026-08-11T12:00:00Z")),
    false,
  );
});
