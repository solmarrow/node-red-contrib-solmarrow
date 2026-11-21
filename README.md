# node-red-contrib-solmarrow

Node-RED nodes for [SolMarrow](https://solmarrow.com), the free social media scheduler with AI agents.
Save drafts, schedule posts or publish now to 20+ networks (Instagram, Facebook, LinkedIn, X, Threads, Bluesky,
Pinterest, TikTok, YouTube and more) from any flow.

## Install

In Node-RED: **Menu → Manage palette → Install**, search `node-red-contrib-solmarrow`. Or:

```bash
cd ~/.node-red
npm install node-red-contrib-solmarrow
```

## Set up

1. In SolMarrow open **Settings → API keys** and create a key (`smk_...`).
2. Drop a **solmarrow post** node into a flow, click the pencil next to *SolMarrow* and paste the key.

The key is kept in Node-RED's encrypted credentials and is never exported with a flow.

## Nodes

### solmarrow post

Sends `msg.payload` to SolMarrow.

| Action | Needs accounts | Result |
| --- | --- | --- |
| Save a draft | no | A draft in your SolMarrow calendar |
| Schedule | yes | Goes out after *Minutes ahead* (or `msg.scheduleAt`, at least 5 minutes ahead) |
| Publish now | yes | Publishes right away |

Input:

- `msg.payload`: the text, or `{ text, accountIds, mediaUrls, mediaIds, scheduleAt, mode }`
- `msg.accountIds`: accounts to post to (overrides the node setting)
- `msg.mediaUrls`: public https links to images or videos
- `msg.scheduleAt`: ISO date or `Date`

Output: `msg.payload` is the post (`post_id`, `status`, `scheduled_at`, `calendar_url`).
A retried message never creates a second post.

### solmarrow accounts

Outputs the connected accounts (`id`, `network`, `name`, `handle`, `status`). Use the `id` values in
*solmarrow post*.

## Example

Import **Menu → Import → Examples → node-red-contrib-solmarrow → save-draft**.

```text
[inject "New blog post"] → [solmarrow post: Save a draft] → [debug]
```

## Links

- JavaScript SDK: https://www.npmjs.com/package/solmarrow
- API reference: https://solmarrow.com/developers
- Support: support@solmarrow.com

MIT License
