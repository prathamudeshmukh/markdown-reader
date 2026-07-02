# @openmark/mcp

MCP server for [openmark](https://openmark.cc) — lets AI coding agents create, read, and update markdown documents.

## Tools

| Tool | Description |
|------|-------------|
| `openmark_create_doc` | Create a new markdown document and return its shareable URL |
| `openmark_read_doc` | Read a document's content by slug or full URL |
| `openmark_update_doc` | Replace the content of an existing document you own |
| `openmark_list_comments` | List comments left on a document |
| `openmark_resolve_comment` | Mark a comment resolved or unresolved |
| `openmark_delete_comment` | Delete a comment on a document you own |

## Setup

### 1. Get an API key

Sign in at [openmark.cc](https://openmark.cc), go to **Settings → API Keys**, and generate a key. It starts with `omk_`.

### 2. Add to your MCP client

**Claude Code (CLI)** — run once in your terminal:

```bash
claude mcp add openmark -e OPENMARK_API_KEY=omk_your_key_here -- npx -y @openmark/mcp
```

This writes to `~/.claude.json`. Verify with `claude mcp list`.

---

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openmark": {
      "command": "npx",
      "args": ["-y", "@openmark/mcp"],
      "env": {
        "OPENMARK_API_KEY": "omk_your_key_here"
      }
    }
  }
}
```

**Cursor** — edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openmark": {
      "command": "npx",
      "args": ["-y", "@openmark/mcp"],
      "env": {
        "OPENMARK_API_KEY": "omk_your_key_here"
      }
    }
  }
}
```

Restart your MCP client after saving.

## Tool reference

### `openmark_create_doc`

Creates a new document and returns its URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | yes | Markdown content (max 500 KB) |
| `title` | string | no | Document title (max 300 chars) |

### `openmark_read_doc`

Reads a document by slug or full URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | yes | 7-character slug (e.g. `abc1234`) or full openmark URL |

### `openmark_update_doc`

Replaces the content of a document you own.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | yes | 7-character slug or full openmark URL |
| `content` | string | yes | New markdown content |
| `title` | string | no | New title (omit to leave unchanged) |

### `openmark_list_comments`

Lists comments on a document as a plain-text digest (one line per comment: id, resolved state, author, the anchored text it was left on — if any — and content). The anchored text lets an agent locate which part of the document a comment refers to. Available to any visitor, matching the doc's open comment-reading behavior.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | yes | 7-character slug or full openmark URL |

### `openmark_resolve_comment`

Marks a comment resolved or unresolved. Not restricted to the doc owner, matching the doc's open resolve behavior. There is no tool for editing comment content — only the `resolved` flag can be toggled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | yes | 7-character slug or full openmark URL |
| `commentId` | string | yes | The comment id, from `openmark_list_comments` |
| `resolved` | boolean | yes | `true` to resolve, `false` to unresolve |

### `openmark_delete_comment`

Deletes a comment. Restricted to the document owner — returns a 403 error if the API key doesn't belong to the doc's owner.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | yes | 7-character slug or full openmark URL |
| `commentId` | string | yes | The comment id, from `openmark_list_comments` |

## Local development

```bash
cd mcp
npm install
npm test          # run tests once
npm run test:watch  # watch mode
npm run build     # compile TypeScript to dist/
```

Run the server locally against the production API:

```bash
OPENMARK_API_KEY=omk_your_key_here node dist/index.js
```

To test against a local worker dev server, register it in Claude Code CLI:

```bash
claude mcp add openmark-local \
  -e OPENMARK_API_KEY=omk_your_key_here \
  -e OPENMARK_BASE_URL=http://localhost:8787 \
  -- node /path/to/markdown-reader/mcp/dist/index.js
```

Then start the worker (`npm run wrangler:dev` from the repo root) and run `claude mcp list` to confirm it's registered.

## Release workflow

Releases are triggered by pushing a `mcp/v*.*.*` git tag from the repo root.

1. Make your changes inside `mcp/`
2. Run tests: `npm test`
3. Bump `version` in `mcp/package.json` (follow semver)
4. Commit and tag:
   ```bash
   git add mcp/package.json
   git commit -m "chore: bump mcp to v1.x.x"
   git tag mcp/v1.x.x
   git push origin main --tags
   ```
5. CI builds, type-checks, tests, and stages the package to npm
6. Go to **npmjs.com → @openmark/mcp → Staged Packages**, review, and **Approve** (requires 2FA)

The package publishes under the `latest` tag once approved.
