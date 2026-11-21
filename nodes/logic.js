"use strict";
// Pure helpers (no Node-RED imports) so they can be unit tested.

const list = (v) =>
  (Array.isArray(v) ? v : String(v ?? "").split(/[\s,]+/))
    .map((x) => String(x).trim())
    .filter(Boolean);

function firstWorkspace(workspaces) {
  if (!Array.isArray(workspaces) || !workspaces[0] || !workspaces[0].id) throw new Error("SolMarrow did not return a workspace for this API key.");
  return workspaces[0];
}

/**
 * Builds the post from the node settings and the message.
 * msg.payload: the text (string), or an object { text, accountIds, mediaIds, mediaUrls, scheduleAt }.
 * msg.accountIds / msg.mediaUrls / msg.scheduleAt override the node settings.
 */
function buildPost(config, msg, nodeId) {
  const p = msg.payload && typeof msg.payload === "object" && !Array.isArray(msg.payload) ? msg.payload : { text: msg.payload };
  const text = p.text ?? msg.text ?? config.text ?? "";
  if (typeof text !== "string" || !text.trim()) throw new Error("No post text: send it in msg.payload (or msg.payload.text).");
  const accountIds = list(p.accountIds ?? msg.accountIds ?? config.accounts);
  const mediaIds = list(p.mediaIds ?? msg.mediaIds);
  const mediaUrls = list(p.mediaUrls ?? msg.mediaUrls ?? config.mediaUrls);
  for (const u of mediaUrls) if (!/^https:\/\//i.test(u)) throw new Error(`Media links must be public https links: ${u}`);
  const mode = p.mode ?? msg.mode ?? config.mode ?? "draft";
  const input = { text, accountIds };
  if (mode === "draft") {
    input.draft = true;
  } else if (mode === "schedule") {
    const at = p.scheduleAt ?? msg.scheduleAt;
    if (at) {
      const t = at instanceof Date ? at : new Date(at);
      if (Number.isNaN(t.getTime())) throw new Error(`scheduleAt is not a date: ${at}`);
      input.scheduleAt = t.toISOString();
    } else {
      const minutes = Number(config.delay ?? 60);
      if (!Number.isFinite(minutes) || minutes < 5) throw new Error("Schedule at least 5 minutes ahead.");
      input.scheduleAt = new Date(Date.now() + minutes * 60000).toISOString();
    }
    if (!accountIds.length) throw new Error("Pick at least one account to schedule a post (or save a draft).");
  } else if (mode === "now") {
    input.publishNow = true;
    if (!accountIds.length) throw new Error("Pick at least one account to publish now (or save a draft).");
  } else {
    throw new Error(`Unknown mode "${mode}". Use draft, schedule or now.`);
  }
  if (msg._msgid) input.idempotencyKey = `node-red-${nodeId || "node"}-${msg._msgid}`.slice(0, 200);
  return { input, mediaIds, mediaUrls };
}

function errorText(err) {
  if (!err) return "Unknown error";
  if (err.status === 401) return "SolMarrow did not accept the API key. Create a new key in SolMarrow: Settings > API keys.";
  return String(err.message || err);
}

module.exports = { firstWorkspace, buildPost, errorText, list };
