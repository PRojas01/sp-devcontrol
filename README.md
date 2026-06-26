# SP-DevControl

[![npm version](https://img.shields.io/npm/v/sp-devcontrol)](https://www.npmjs.com/package/sp-devcontrol)
[![CI](https://github.com/PRojas01/sp-devcontrol/actions/workflows/ci.yml/badge.svg)](https://github.com/PRojas01/sp-devcontrol/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue)](https://github.com/PRojas01/sp-devcontrol/releases)

**Local governance layer for AI-assisted development.**  
Protect your project from uncontrolled AI agent changes with policy enforcement, approval gates, compliance reports, and universal MCP integration.

---

## Why DevControl

AI coding agents (Claude Code, Cursor, Copilot) ship code at machine speed. Without guardrails, one bad prompt can delete tests, expose secrets, or bypass code review.

DevControl gives you:

- **Policy enforcement** — protect critical paths, block dangerous commands
- **Approval gates** — no change goes in without review
- **Audit trail** — every file change is tracked per session
- **Compliance** — 36 controls mapped to OWASP, RGPD, ISO 27001, CWE, SLSA
- **Universal MCP** — works with every major AI editor out of the box

There is no other tool doing governance-for-agentic-development. DevControl fills that gap.

---

## Quickstart

```bash
# Install globally
npm install -g sp-devcontrol

# Initialize governance for your project
cd my-project
sp-devcontrol init --project-name my-project

# Check project health
sp-devcontrol project:check

# Start a governed session
sp-devcontrol session:start --objective "implement feature X"

# Monitor changes in real time
sp-devcontrol watch:start --session <id>

# Approve or reject changes
sp-devcontrol session:change:approve --change-id <id>
sp-devcontrol session:change:reject --change-id <id>

# Generate compliance report
sp-devcontrol report:compliance

# Close session
sp-devcontrol session:close --session <id>
```

### Standalone binary (no Node.js required)

```bash
curl -L https://github.com/PRojas01/sp-devcontrol/releases/latest/download/devcontrol-linux-x64 -o devcontrol
chmod +x devcontrol && sudo mv devcontrol /usr/local/bin/
```

Linux x64, ARM64, and Windows x64 binaries available.

---

## MCP Integration

DevControl exposes a universal MCP server (6 tools) that works with every major AI editor.

### Claude Code

```bash
# stdio mode (no daemon needed)
claude mcp add devcontrol -- devcontrol mcp:stdio

# Or HTTP mode (with daemon)
# .claude/mcp.json:
{
  "mcpServers": {
    "devcontrol": { "type": "sse", "url": "http://localhost:7893/mcp" }
  }
}
```

### opencode

```bash
# Auto-generate config
devcontrol skill:generate
# Will create/modify opencode.json with MCP server entry
```

### Cursor

```bash
# Cursor reads .cursorrules automatically after:
devcontrol inject
# MCP: Settings → Cursor → MCP Servers → Add → devcontrol@http://localhost:7893/mcp
```

### Windsurf

```bash
# Auto-generate .windsurfrules:
devcontrol inject
```

### GitHub Copilot

```bash
# Generates copilot-instructions.md:
devcontrol inject
```

---

## Full Command Reference

### Project
| Command | Description |
|---------|-------------|
| `init` | Initialize governance structure |
| `project:status` | Show project governance status |
| `project:check` | Full preflight with phase detection |

### Sessions
| Command | Description |
|---------|-------------|
| `session:start` | Start governed session with preflight |
| `session:check` | Verify tokens and refresh context |
| `session:checklist:update` | Update session checklist |
| `session:close` | Close session |

### Changes
| Command | Description |
|---------|-------------|
| `session:changes:list` | List detected changes |
| `session:change:show` | Change detail |
| `session:change:approve` | Approve change with snapshot |
| `session:change:reject` | Reject and rollback |

### Approvals
| Command | Description |
|---------|-------------|
| `session:approval:list` | List active approvals |
| `session:approval:grant` | Grant approval |
| `session:approval:revoke` | Revoke approval |

### Policy
| Command | Description |
|---------|-------------|
| `policy:path` | Evaluate path risk |
| `policy:command` | Evaluate command risk |
| `policy:protected:list\|add\|remove` | Manage protected paths |
| `policy:command:approved:list\|approve\|revoke` | Manage approved commands |

### Monitoring & Snapshots
| Command | Description |
|---------|-------------|
| `watch:start` | Start file watcher |
| `snapshot:create` | Manual snapshot |
| `session:snapshots:list` | List session snapshots |
| `session:rollback` | Rollback by change or session |
| `hooks:install\|uninstall\|status` | Git hooks management |

### Reports
| Command | Description |
|---------|-------------|
| `report:compliance` | Generate compliance report |
| `report:session` | Generate session report |

### Agent Sandbox
| Command | Description |
|---------|-------------|
| `agent:run` | Run AI agent in sandbox, capture changes |

### Daemon & MCP
| Command | Description |
|---------|-------------|
| `daemon start\|status\|stop` | Background service |
| `mcp:serve` | Start MCP server |
| `mcp:stdio` | MCP in stdio mode |
| `skill:generate` | Generate editor configs |
| `inject` | Inject rules for all editors |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              CLI (37 commands)               │
├──────────┬──────────┬──────────┬────────────┤
│  Session │  Policy  │ Watcher  │ Compliance │
│  Manager │  Engine  │ +Burst   │  +36 Ctrl  │
├──────────┴──────────┴──────────┴────────────┤
│              REST API :7891                  │
│              MCP Server :7893                │
├─────────────────────────────────────────────┤
│  Storage (JSON/SQLite)  │  Git Integration  │
└─────────────────────────────────────────────┘
```

**37 commands** · **6 MCP tools** · **36 compliance controls** · **5 editor integrations**

---

## Compliance

36 controls across 8 categories, mapped to:

| Standard | Coverage |
|----------|----------|
| OWASP Top 10 | 8 controls |
| RGPD | 6 controls |
| ISO 27001 | 10 controls |
| CWE | 7 controls |
| SLSA | 5 controls |

Generate evidence-ready reports with `sp-devcontrol report:compliance`.

---

## Benchmark

| Feature | DevControl | Any alternative |
|---------|-----------|----------------|
| Governance for AI agents | ✅ Complete | ❌ Does not exist |
| Universal MCP | ✅ 5 editors | ❌ None |
| Compliance (OWASP, RGPD, ISO) | ✅ 36 controls | ❌ None |
| Session rollback | ✅ Implemented | ❌ None |
| Standalone binaries | ✅ 53MB Linux+Win | — |
| CI/CD | ✅ GitHub Actions | — |

No direct competitor exists in the AI-development-governance space.

---

## Roadmap

- **v2.1**: Tauri desktop app, SQLite as primary storage, WebSocket notifications
- **v2.2**: Visual session dashboard, enhanced reporting UI
- **v2.3**: Plugin system for custom controls, team collaboration features

---

## License

MIT © 2026 Pedro Rojas — SolucionesPro (Ecuador)

---

*SP-DevControl v2.0.0 — Built with ❤️ in Ecuador*
