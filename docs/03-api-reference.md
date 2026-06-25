# REST API Reference — SP-DevControl

## Overview

The DevControl REST API exposes governance operations over HTTP. The API daemon must be running before any requests can be made.

```bash
# Start the daemon
sp-devcontrol daemon start

# Verify it is running
sp-devcontrol daemon status
```

The API binds to **127.0.0.1:7891** (localhost only). Remote access is denied at the network and middleware levels.

| Attribute | Value |
|-----------|-------|
| Base URL | `http://127.0.0.1:7891` |
| Protocol | HTTP/1.1 |
| Content-Type | `application/json` |
| Port | 7891 (fixed) |
| Scope | localhost only |
| CORS | Local origins only (localhost, 127.0.0.1, ::1) |

---

## Authentication

All endpoints except `GET /health` require a Bearer token. The token is stored in `~/.devcontrol/api-token` and is generated automatically during `sp-devcontrol init` or on first daemon start.

```bash
# Read the token
TOKEN=$(cat ~/.devcontrol/api-token)

# Use it in requests
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:7891/status
```

If the token is missing or invalid, the API responds with `401 Unauthorized`.

### Project Path Resolution

Endpoints that operate on a project scope resolve the target project from the `X-Project-Path` header. If omitted, the daemon's current working directory is used.

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Project-Path: /home/user/my-project" \
     http://127.0.0.1:7891/status
```

---

## Endpoints

### `GET /health`

Health check. Does **not** require authentication.

**Response `200`**

```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 847
}
```

**Example**

```bash
curl http://127.0.0.1:7891/health
```

---

### `GET /status`

Project governance status summary.

**Response `200`**

```json
{
  "project": "my-project",
  "projectRoot": "/home/user/my-project",
  "configured": true,
  "activeSessions": 1,
  "totalSessions": 12,
  "pendingChanges": 3,
  "version": "2.0.0",
  "stack": ["node", "express", "react"]
}
```

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:7891/status
```

---

### `POST /sessions/start`

Start a new governed session.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `objective` | string | yes | Goal or task description |
| `agent` | string | no | Agent identifier (default: `claude-code`) |

**Response `201`**

```json
{
  "id": "sc-20260625-a1b2c3d4",
  "projectName": "my-project",
  "agent": "claude-code",
  "mode": "watch",
  "objective": "implement user authentication module",
  "status": "active",
  "startedAt": "2026-06-25T14:04:14.000Z",
  "totalChanges": 0,
  "approved": 0,
  "rejected": 0
}
```

**Example**

```bash
curl -X POST http://127.0.0.1:7891/sessions/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"objective": "implement user authentication module", "agent": "cursor"}'
```

---

### `POST /session/check`

> **Note:** This endpoint is not exposed via the REST API.  
> Use the CLI command `sp-devcontrol session:check --session <id>` instead.

---

### `POST /sessions/:id/close`

Close an active session.

**URL parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | Session ID (e.g. `sc-20260625-a1b2c3d4`) |

**Response `200`**

```json
{
  "id": "sc-20260625-a1b2c3d4",
  "status": "completed",
  "endedAt": "2026-06-25T15:30:00.000Z",
  "totalChanges": 5,
  "approved": 4,
  "rejected": 1
}
```

**Error responses**

| Code | Condition |
|------|-----------|
| `404` | Session not found |
| `409` | Session already closed |

**Example**

```bash
curl -X POST http://127.0.0.1:7891/sessions/sc-20260625-a1b2c3d4/close \
  -H "Authorization: Bearer $TOKEN"
```

---

### `GET /sessions`

List recent sessions for the project.

**Query parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `20` | Max sessions to return (1–200) |

**Response `200`**

```json
[
  {
    "id": "sc-20260625-a1b2c3d4",
    "projectName": "my-project",
    "status": "active",
    "startedAt": "2026-06-25T14:04:14.000Z",
    "totalChanges": 5,
    "approved": 4,
    "rejected": 1
  },
  {
    "id": "sc-20260624-f9e8d7c6",
    "projectName": "my-project",
    "status": "completed",
    "startedAt": "2026-06-24T10:00:00.000Z",
    "endedAt": "2026-06-24T12:30:00.000Z",
    "totalChanges": 8,
    "approved": 7,
    "rejected": 1
  }
]
```

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:7891/sessions?limit=5"
```

---

### `GET /sessions/:id`

Get details for a single session.

**Response `200`**

```json
{
  "id": "sc-20260625-a1b2c3d4",
  "projectName": "my-project",
  "agent": "claude-code",
  "mode": "watch",
  "objective": "implement user authentication module",
  "status": "active",
  "startedAt": "2026-06-25T14:04:14.000Z",
  "totalChanges": 5,
  "approved": 4,
  "rejected": 1
}
```

**Error `404`**

```json
{ "error": "Session not found" }
```

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:7891/sessions/sc-20260625-a1b2c3d4
```

---

### `GET /sessions/:id/changes`

List all changes recorded in a session.

**URL parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | Session ID |

**Response `200`**

```json
[
  {
    "id": "ds-20260625-001-c01",
    "sessionId": "sc-20260625-a1b2c3d4",
    "status": "pending",
    "files": [
      { "filepath": "src/auth/login.ts" },
      { "filepath": "src/auth/login.test.ts" }
    ],
    "detectedAt": "2026-06-25T14:10:00.000Z"
  },
  {
    "id": "ds-20260625-001-c02",
    "sessionId": "sc-20260625-a1b2c3d4",
    "status": "approved",
    "files": [
      { "filepath": "src/config.ts" }
    ],
    "detectedAt": "2026-06-25T14:05:00.000Z"
  }
]
```

**Error `404`**

```json
{ "error": "Session not found" }
```

**Example**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:7891/sessions/sc-20260625-a1b2c3d4/changes
```

---

### `POST /sessions/:id/changes/:cid/approve`

Approve a pending change. Increments the session's approved counter.

**URL parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | Session ID |
| `cid` | Change ID (e.g. `ds-20260625-001-c01`) |

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | no | Approval note |

**Response `200`**

```json
{
  "change": {
    "id": "ds-20260625-001-c01",
    "sessionId": "sc-20260625-a1b2c3d4",
    "status": "approved",
    "files": [{ "filepath": "src/auth/login.ts" }]
  },
  "approval": {
    "id": "ap-20260625-xxxx",
    "sessionId": "sc-20260625-a1b2c3d4",
    "approvalType": "change",
    "target": "ds-20260625-001-c01",
    "scope": "session",
    "reason": "LGTM, covers all edge cases",
    "createdBy": "user"
  }
}
```

**Error responses**

| Code | Condition |
|------|-----------|
| `404` | Session or change not found |
| `409` | Change is not pending (already approved/rejected) |

**Example**

```bash
curl -X POST http://127.0.0.1:7891/sessions/sc-20260625-a1b2c3d4/changes/ds-20260625-001-c01/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "LGTM, covers all edge cases"}'
```

---

### `POST /sessions/:id/changes/:cid/reject`

Reject a pending change. Increments the session's rejected counter.

**URL parameters**

| Parameter | Description |
|-----------|-------------|
| `id` | Session ID |
| `cid` | Change ID |

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | no | Reason for rejection |

**Response `200`**

```json
{
  "change": {
    "id": "ds-20260625-001-c01",
    "sessionId": "sc-20260625-a1b2c3d4",
    "status": "rejected",
    "files": [{ "filepath": "src/auth/login.ts" }]
  }
}
```

**Error responses**

| Code | Condition |
|------|-----------|
| `404` | Session or change not found |
| `409` | Change is not pending |

**Example**

```bash
curl -X POST http://127.0.0.1:7891/sessions/sc-20260625-a1b2c3d4/changes/ds-20260625-001-c01/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Needs unit tests before merging"}'
```

---

### Additional Endpoints

The API also exposes project registry endpoints (not required for session governance):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects` | List registered projects |
| `POST` | `/projects/register` | Register a project path |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created (session started, project registered) |
| `400` | Bad request — missing or invalid parameters |
| `401` | Unauthorized — missing or invalid Bearer token |
| `403` | Forbidden — non-local origin |
| `404` | Not found — session or change does not exist |
| `409` | Conflict — change already processed or session closed |
| `500` | Internal server error |

All error responses follow this shape:

```json
{ "error": "Session not found" }
```

---

## Quick Reference — All Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `GET` | `/status` | Yes | Project status summary |
| `POST` | `/sessions/start` | Yes | Start a new session |
| `GET` | `/sessions` | Yes | List sessions |
| `GET` | `/sessions/:id` | Yes | Get session details |
| `POST` | `/sessions/:id/close` | Yes | Close active session |
| `GET` | `/sessions/:id/changes` | Yes | List changes in session |
| `POST` | `/sessions/:id/changes/:cid/approve` | Yes | Approve a change |
| `POST` | `/sessions/:id/changes/:cid/reject` | Yes | Reject a change |
| `GET` | `/projects` | Yes | List registered projects |
| `POST` | `/projects/register` | Yes | Register a project |

---

SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License
