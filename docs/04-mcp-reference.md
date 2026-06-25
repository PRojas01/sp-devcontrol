# MCP Server Reference — SP-DevControl

## Overview

The DevControl MCP (Model Context Protocol) server provides a universal governance interface that works with every major AI editor. It is the standard integration mechanism for agentic coding tools.

The server supports two transport modes:

| Mode | Transport | Port | Use case |
|------|-----------|------|----------|
| **stdio** | Standard I/O | — | Editors that spawn a subprocess (Claude Code, opencode) |
| **HTTP/SSE** | Streamable HTTP | 7893 | Editors that connect via HTTP (Cursor, Windsurf, Copilot) |

---

## Quick Start

### Daemon mode (HTTP/SSE)

```bash
# Start the daemon (includes both REST API :7891 and MCP :7893)
sp-devcontrol daemon start

# Or start only the MCP server
sp-devcontrol mcp:serve
```

### stdio mode (no daemon)

```bash
sp-devcontrol mcp:stdio
```

---

## Editor Setup

### Claude Code

**stdio mode** (recommended):

```bash
claude mcp add devcontrol -- sp-devcontrol mcp:stdio
```

**HTTP/SSE mode** (requires daemon running):

Create or edit `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "devcontrol": {
      "type": "sse",
      "url": "http://localhost:7893/mcp"
    }
  }
}
```

---

### opencode

Generate the MCP config automatically:

```bash
sp-devcontrol skill:generate
```

This creates or updates `opencode.json` with the MCP server entry pointing to `http://localhost:7893/mcp`.

---

### Cursor

1. Run `sp-devcontrol inject` to generate `.cursorrules`
2. Open Cursor Settings → MCP Servers
3. Add a new server:
   - **Name**: `devcontrol`
   - **Type**: `sse`
   - **URL**: `http://localhost:7893/mcp`

---

### Windsurf

1. Run `sp-devcontrol inject` to generate `.windsurfrules`
2. Configure the MCP server in Windsurf settings to connect to `http://localhost:7893/mcp`

---

### GitHub Copilot

1. Run `sp-devcontrol inject` to generate `copilot-instructions.md`
2. Configure MCP in Copilot settings to connect to `http://localhost:7893/mcp`

---

## Tools Reference

The MCP server exposes **8 tools**. Below each is documented with its registered name, description, parameters, and example usage.

---

### `devcontrol_status`

Maps to semantic name: **project:status**

Returns the current project governance status, including preflight check results, active session info, and pending changes.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectRoot` | string | no | Absolute path to project (defaults to server CWD) |

**Example call**

```json
{
  "name": "devcontrol_status",
  "arguments": {}
}
```

**Example response (text/markdown)**

```markdown
# DevControl Status
**Project:** /home/user/my-project
**Time:** 2026-06-25T14:04:14.000Z

## Preflight
Phase: **development**
All checks passed.

## Active Session
**ID:** sc-20260625-a1b2c3d4
**Agent:** claude-code
**Started:** 2026-06-25T14:04:14.000Z
**Objective:** implement user authentication module
**Changes:** total=5 approved=4 rejected=1

## Pending Changes (1)
- `ds-20260625-001-c01` — src/auth/login.ts, src/auth/login.test.ts
```

---

### `devcontrol_session_start`

Maps to semantic name: **session:start**

Starts a new governance session. Fails if a session is already active.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `objective` | string | yes | Goal or task description |
| `agent` | string | no | Agent identifier (default: `mcp-agent`) |
| `projectRoot` | string | no | Absolute path to project (defaults to server CWD) |

**Example call**

```json
{
  "name": "devcontrol_session_start",
  "arguments": {
    "objective": "implement user authentication module",
    "agent": "cursor"
  }
}
```

**Example response**

```markdown
Session started.
**ID:** sc-20260625-a1b2c3d4
**Agent:** cursor
**Objective:** implement user authentication module
```

**Error** — session already active:

```markdown
A session is already active: `sc-20260624-f9e8d7c6`. End it before starting a new one.
```

**Error** — not initialized:

```markdown
DevControl is not initialized. Run `devcontrol init` first.
```

---

### `devcontrol_approve_change`

Maps to semantic name: **change:approve**

Approves a pending change by ID. The change must be in `pending` status.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `changeId` | string | yes | Change ID (e.g. `ds-20260625-001-c01`) |
| `message` | string | no | Optional approval note |
| `projectRoot` | string | no | Absolute path to project (defaults to server CWD) |

**Example call**

```json
{
  "name": "devcontrol_approve_change",
  "arguments": {
    "changeId": "ds-20260625-001-c01",
    "message": "LGTM, covers all edge cases"
  }
}
```

**Example response**

```markdown
Change `ds-20260625-001-c01` approved.
Note: LGTM, covers all edge cases
```

**Error** — not found:

```markdown
Change `ds-20260625-001-c01` not found.
```

**Error** — not pending:

```markdown
Change `ds-20260625-001-c01` is not pending (current status: approved).
```

---

### `devcontrol_reject_change`

Maps to semantic name: **change:reject**

Rejects a pending change by ID.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `changeId` | string | yes | Change ID to reject |
| `message` | string | no | Reason for rejection |
| `projectRoot` | string | no | Absolute path to project (defaults to server CWD) |

**Example call**

```json
{
  "name": "devcontrol_reject_change",
  "arguments": {
    "changeId": "ds-20260625-001-c01",
    "message": "Needs unit tests before merging"
  }
}
```

**Example response**

```markdown
Change `ds-20260625-001-c01` rejected.
Reason: Needs unit tests before merging
```

---

### `devcontrol_policy_check`

Evaluates a file path or shell command against the project's policy rules.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | enum(`"path"`, `"command"`) | yes | What to evaluate |
| `value` | string | yes | The path or command string |
| `projectRoot` | string | no | Absolute path to project (defaults to server CWD) |

**Example call — path evaluation**

```json
{
  "name": "devcontrol_policy_check",
  "arguments": {
    "type": "path",
    "value": "src/config/database.ts"
  }
}
```

**Example response (path)**

```markdown
## Path Risk: `src/config/database.ts`
**Risk:** low
**Protected:** no
**Approved:** yes
```

**Example call — command evaluation**

```json
{
  "name": "devcontrol_policy_check",
  "arguments": {
    "type": "command",
    "value": "rm -rf /etc"
  }
}
```

**Example response (command)**

```markdown
## Command Risk: `rm -rf /etc`
**Decision:** blocked
**Reason:** Path /etc is protected
```

---

### `devcontrol_compliance_report`

Generates a full compliance report for the project in Markdown, covering all 36 controls mapped to OWASP, RGPD, ISO 27001, CWE, and SLSA.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectRoot` | string | no | Absolute path to project (defaults to server CWD) |

**Example call**

```json
{
  "name": "devcontrol_compliance_report",
  "arguments": {}
}
```

**Example response**

A large Markdown document with sections per control category, control status, and normative mapping.

---

### CLI-Only Commands

The following governance operations are available via the CLI but are **not exposed as individual MCP tools**:

| Semantic name | CLI command | Available via |
|---------------|-------------|---------------|
| `session:check` | `sp-devcontrol session:check --session <id>` | CLI only |
| `session:close` | `sp-devcontrol session:close --session <id>` | CLI + REST API `POST /sessions/:id/close` |

---

## Tool Summary

| Tool name | Semantic name | Params |
|-----------|---------------|--------|
| `devcontrol_status` | `project:status` | `projectRoot?` |
| `devcontrol_session_start` | `session:start` | `objective` (req), `agent?`, `projectRoot?` |
| `devcontrol_approve_change` | `change:approve` | `changeId` (req), `message?`, `projectRoot?` |
| `devcontrol_reject_change` | `change:reject` | `changeId` (req), `message?`, `projectRoot?` |
| `devcontrol_policy_check` | `policy:check` | `type` (req), `value` (req), `projectRoot?` |
| `devcontrol_compliance_report` | `report:compliance` | `projectRoot?` |

---

## How to Start

### Daemon (background, HTTP/SSE)

```bash
sp-devcontrol daemon start
```

The MCP server starts automatically on port 7893 alongside the REST API on port 7891.

### Standalone MCP server (HTTP/SSE)

```bash
sp-devcontrol mcp:serve
```

For custom port, edit `.devcontrol/config.json`:

```json
{
  "mcpPort": 7893
}
```

### stdio mode (foreground, for editor subprocess)

```bash
sp-devcontrol mcp:stdio
```

This runs until the parent process closes the stdin pipe. Use this mode when configuring MCP in editors that support subprocess-based servers.

---

SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License
