import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the character creation experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>SYSTEM — Character Creation<\/title>/i);
  assert.match(html, /Character Creation/);
  assert.match(html, /Configure your identity and initialize your SYSTEM/);
  assert.match(html, /CONTINUE/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps the application shell wired to shared player state", async () => {
  const [page, layout, store] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/player-store.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /export default function Home/);
  assert.match(page, /Character Creation/);
  assert.match(layout, /PlayerProvider/);
  assert.match(store, /completeQuestCommand/);
  assert.match(store, /completeHabitCommand/);
});
