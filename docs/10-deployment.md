# SP-DevControl v2 — Deployment Guide

> Ports: REST API `:7891`, MCP HTTP/SSE `:7893`.
> All services listen on `127.0.0.1` only.

---

## 1. npm Installation (recommended)

Requires Node.js ≥ 18.

```bash
npm install -g sp-devcontrol

# Verify installation
sp-devcontrol --version
sp-devcontrol project:check
```

Upgrade:

```bash
npm update -g sp-devcontrol
```

---

## 2. Standalone Binary — Linux

No Node.js required on the target machine.

```bash
# Linux x64
curl -L https://github.com/SolucionesPro/sp-devcontrol/releases/latest/download/devcontrol-linux-x64 -o devcontrol
chmod +x devcontrol && sudo mv devcontrol /usr/local/bin/

# Linux ARM64
curl -L https://github.com/SolucionesPro/sp-devcontrol/releases/latest/download/devcontrol-linux-arm64 -o devcontrol
chmod +x devcontrol && sudo mv devcontrol /usr/local/bin/
```

---

## 3. Standalone Binary — Windows

```powershell
# Windows x64
curl -L https://github.com/SolucionesPro/sp-devcontrol/releases/latest/download/devcontrol-win-x64.exe -o devcontrol.exe
# Move to a directory in your PATH
```

---

## 4. Quick Start

```bash
# Initialize a project
cd my-project
sp-devcontrol init --project-name my-project

# Run preflight checks
sp-devcontrol project:check

# Start a governed session
sp-devcontrol session:start --objective "implement feature X"

# Start file watcher
sp-devcontrol watch:start --session <session-id>

# Approve or reject changes
sp-devcontrol session:change:approve --change-id <id>
sp-devcontrol session:change:reject --change-id <id>

# Close session
sp-devcontrol session:close --session <id>

# Generate compliance report
sp-devcontrol report:compliance

# Run an AI agent in sandbox mode
sp-devcontrol agent:run --agent opencode --prompt "add login feature"
```

---

## 5. Daemon Mode (Background Service)

```bash
# Start daemon
sp-devcontrol daemon start
# Daemon starts REST API on :7891 and MCP Server on :7893

# Check daemon status
sp-devcontrol daemon status

# Stop daemon
sp-devcontrol daemon stop
```

The daemon creates:
- `.devcontrol/daemon.pid` — PID file for process management
- `.devcontrol/daemon.state` — Daemon state (JSON)
- `.devcontrol/api-token` — Auto-generated auth token (64-char hex, mode 0600)

---

## 6. MCP Server

```bash
# HTTP/SSE mode (requires daemon)
sp-devcontrol mcp:serve

# stdio mode (no daemon, for editor integration)
sp-devcontrol mcp:stdio
```

### Editor Integration

**Claude Code:**
```bash
claude mcp add devcontrol -- devcontrol mcp:stdio
```

**opencode:**
```json
{
  "mcpServers": {
    "devcontrol": { "type": "sse", "url": "http://localhost:7893/mcp" }
  }
}
```

**Cursor:** Settings → MCP Servers → Add → devcontrol@http://localhost:7893/mcp

---

## 7. REST API

With daemon running, the REST API is available at `http://127.0.0.1:7891`.

See [03-api-reference.md](03-api-reference.md) for full API documentation.

---

## 8. CI/CD Integration

### GitHub Actions

The project includes CI/CD workflows:
- `.github/workflows/ci.yml` — Build + test on push/PR (Node 18, 20, 22)
- `.github/workflows/release.yml` — Build binaries + publish on tag push (v*)

### Custom CI

```bash
# TypeScript check
npx tsc --noEmit

# Run tests
npm test

# Build standalone binaries
npm run pkg:all
```

---

## 9. Production Considerations

### Security
- All API and MCP endpoints are protected by token auth
- Token stored in `.devcontrol/api-token` with restricted file permissions (0600)
- Path traversal prevention is built into the policy engine
- Commands are evaluated with exact matching (no substring bypass)

### Storage
- Default: JSON files in `.devcontrol/storage/` with atomic writes
- SQLite backend available for larger projects
- Automatic backup (.bak) on database open

### Monitoring
- File watcher uses Chokidar (polling on Windows, events on Linux)
- Burst processing window: 2 seconds (configurable)
- Deleted files are preserved in `.devcontrol/deleted-attempts/`

### Logs
- Audit logs stored in `.devcontrol/sessions/`
- Daily summaries generated automatically
- Session artifacts include: context, checklist, diff summary, audit trail

---

## 10. Uninstall

```bash
npm uninstall -g sp-devcontrol
# or remove the standalone binary:
rm /usr/local/bin/devcontrol
```

To remove all project governance data:
```bash
rm -rf .devcontrol/
```

---

## Support

- GitHub Issues: https://github.com/SolucionesPro/sp-devcontrol/issues
- Documentation: See `/docs/` directory
- License: MIT © 2026 Pedro Rojas — SolucionesPro (Ecuador)

---

_SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License_
