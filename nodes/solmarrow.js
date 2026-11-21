"use strict";
// Node-RED nodes for SolMarrow: a config node holding the API key, "solmarrow post" and "solmarrow accounts".

const SolMarrow = require("solmarrow");
const logic = require("./logic");

module.exports = function (RED) {
  function SolMarrowConfigNode(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.baseUrl = (config.baseUrl || "").trim() || undefined;
    const apiKey = this.credentials && this.credentials.apiKey;
    this.client = apiKey ? new SolMarrow({ apiKey, baseUrl: this.baseUrl, userAgent: "node-red-contrib-solmarrow/1.0.1" }) : null;
    this._workspace = null;
    this.workspaceId = async () => {
      if (!this.client) throw new Error("Add your SolMarrow API key to the SolMarrow config node.");
      if (!this._workspace) this._workspace = logic.firstWorkspace(await this.client.listWorkspaces());
      return this._workspace.id;
    };
  }
  RED.nodes.registerType("solmarrow-config", SolMarrowConfigNode, {
    credentials: { apiKey: { type: "password" } },
  });

  function fail(node, msg, done, err) {
    const text = logic.errorText(err);
    node.status({ fill: "red", shape: "ring", text: text.slice(0, 60) });
    msg.error = { message: text, status: err && err.status };
    done(new Error(text), msg);
  }

  function SolMarrowPostNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.server = RED.nodes.getNode(config.server);
    node.on("input", async (msg, send, done) => {
      send = send || node.send.bind(node);
      done = done || ((e) => e && node.error(e, msg));
      if (!node.server || !node.server.client) return fail(node, msg, done, new Error("Add your SolMarrow API key to the SolMarrow config node."));
      try {
        const post = logic.buildPost(config, msg, node.id);
        node.status({ fill: "blue", shape: "dot", text: "sending" });
        const sm = node.server.client;
        const ws = await node.server.workspaceId();
        const mediaIds = [...post.mediaIds];
        for (const url of post.mediaUrls) {
          const m = await sm.uploadMediaFromUrl(ws, url);
          mediaIds.push(m.media_id || m.id);
        }
        const result = await sm.createPost(ws, { ...post.input, mediaIds });
        msg.payload = result;
        node.status({ fill: "green", shape: "dot", text: `${result.status || "saved"} ${new Date().toLocaleTimeString()}` });
        send(msg);
        done();
      } catch (err) {
        fail(node, msg, done, err);
      }
    });
  }
  RED.nodes.registerType("solmarrow-post", SolMarrowPostNode);

  function SolMarrowAccountsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.server = RED.nodes.getNode(config.server);
    node.on("input", async (msg, send, done) => {
      send = send || node.send.bind(node);
      done = done || ((e) => e && node.error(e, msg));
      if (!node.server || !node.server.client) return fail(node, msg, done, new Error("Add your SolMarrow API key to the SolMarrow config node."));
      try {
        const ws = await node.server.workspaceId();
        msg.payload = await node.server.client.listAccounts(ws);
        msg.workspaceId = ws;
        node.status({ fill: "green", shape: "dot", text: `${msg.payload.length} accounts` });
        send(msg);
        done();
      } catch (err) {
        fail(node, msg, done, err);
      }
    });
  }
  RED.nodes.registerType("solmarrow-accounts", SolMarrowAccountsNode);
};
