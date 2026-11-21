"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPost, firstWorkspace, errorText, list } = require("../nodes/logic");

test("draft from a string payload, idempotency from msg id", () => {
  const r = buildPost({ mode: "draft" }, { payload: "Hi", _msgid: "m1" }, "n1");
  assert.deepEqual(r.input, { text: "Hi", accountIds: [], draft: true, idempotencyKey: "node-red-n1-m1" });
  assert.deepEqual(r.mediaUrls, []);
});

test("object payload overrides node settings", () => {
  const r = buildPost({ mode: "draft", accounts: "x" }, { payload: { text: "T", accountIds: ["a", "b"], mediaUrls: ["https://e.com/1.jpg"], mediaIds: "m9" } });
  assert.deepEqual(r.input.accountIds, ["a", "b"]);
  assert.deepEqual(r.mediaUrls, ["https://e.com/1.jpg"]);
  assert.deepEqual(r.mediaIds, ["m9"]);
  assert.equal(r.input.idempotencyKey, undefined);
});

test("schedule uses delay or msg.scheduleAt and needs accounts", () => {
  const before = Date.now();
  const r = buildPost({ mode: "schedule", accounts: "a1, a2", delay: 30 }, { payload: "x" });
  const t = Date.parse(r.input.scheduleAt);
  assert.ok(t >= before + 30 * 60000 - 1000 && t <= Date.now() + 30 * 60000 + 1000);
  assert.deepEqual(r.input.accountIds, ["a1", "a2"]);
  const r2 = buildPost({ mode: "schedule", accounts: "a1" }, { payload: "x", scheduleAt: "2030-01-01T10:00:00+06:00" });
  assert.equal(r2.input.scheduleAt, "2030-01-01T04:00:00.000Z");
  assert.throws(() => buildPost({ mode: "schedule" }, { payload: "x" }), /at least one account/);
  assert.throws(() => buildPost({ mode: "schedule", accounts: "a", delay: 2 }, { payload: "x" }), /5 minutes/);
  assert.throws(() => buildPost({ mode: "schedule", accounts: "a" }, { payload: "x", scheduleAt: "nope" }), /not a date/);
});

test("publish now needs accounts", () => {
  assert.equal(buildPost({ mode: "now", accounts: "a" }, { payload: "x" }).input.publishNow, true);
  assert.throws(() => buildPost({ mode: "now" }, { payload: "x" }), /at least one account/);
});

test("rejects empty text, http media, unknown mode", () => {
  assert.throws(() => buildPost({}, { payload: "  " }), /No post text/);
  assert.throws(() => buildPost({}, { payload: { text: "x", mediaUrls: ["http://e.com/a.jpg"] } }), /https/);
  assert.throws(() => buildPost({ mode: "later" }, { payload: "x" }), /Unknown mode/);
});

test("helpers", () => {
  assert.deepEqual(list(" a, b  c,,"), ["a", "b", "c"]);
  assert.equal(firstWorkspace([{ id: "w" }]).id, "w");
  assert.throws(() => firstWorkspace([]), /workspace/);
  assert.match(errorText({ status: 401 }), /API key/);
  assert.equal(errorText(new Error("boom")), "boom");
});
