import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("global navigation exposes a skip link and visible keyboard focus", async () => {
  const [layout, accessibility] = await Promise.all([
    read("../app/layout.tsx"),
    read("../app/accessibility.css"),
  ]);
  assert.match(layout, /<SkipLink/);
  assert.match(accessibility, /:focus-visible/);
  assert.match(accessibility, /\.skip-link/);
});

test("trust and onboarding dialogs are named and modal", async () => {
  const [trust, onboarding] = await Promise.all([
    read("../app/settings/trust-center.tsx"),
    read("../app/onboarding-calibration.tsx"),
  ]);
  for (const source of [trust, onboarding]) {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /aria-labelledby=/);
  }
});

test("Arabic is native Unicode and global presentation cannot change progression", async () => {
  const [experience, css] = await Promise.all([
    read("../app/experience.tsx"),
    read("../app/globals.css"),
  ]);
  assert.match(experience, /اليوم/);
  assert.match(experience, /root\.dir = preferences\.locale === "ar"/);
  assert.doesNotMatch(experience, /\bxp\b|rewardMultiplier|progressionRate/i);
  assert.match(css, /html\[dir=(?:"rtl"|rtl)\]/);
  assert.match(css, /data-mode=(?:"minimal"|minimal)/);
});
