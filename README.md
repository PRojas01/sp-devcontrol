# SP-DevControl

[![npm version](https://img.shields.io/npm/v/sp-devcontrol)](https://www.npmjs.com/package/sp-devcontrol)
[![CI](https://github.com/PRojas01/sp-devcontrol/actions/workflows/ci.yml/badge.svg)](https://github.com/PRojas01/sp-devcontrol/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-115%20passing-brightgreen)](#testing)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue)](https://github.com/PRojas01/sp-devcontrol/releases)

**Local governance layer for AI-assisted development.**

SP-DevControl puts a human in charge of every AI coding session — from architecture design to production publish. It works inside every major AI editor (Claude Code, Cursor, Windsurf, Copilot, opencode, Codex) through a universal MCP integration and auto-generated editor config files.

---

## Why DevControl

AI coding agents ship code at machine speed. Without guardrails, one bad prompt can reset a branch, expose secrets, or push untested code to production.

DevControl gives you:

- **Human authorization gates** — design, development, review, and publish phases each require explicit human sign-off before agents can proceed
- **Policy enforcement** — protect critical paths and block dangerous commands (`git reset --hard`, `rm -rf`, `DROP TABLE` blocked by default)
- **Change approval workflow** — every change detected by a watched session needs your approval or rejection before it goes into git
- **Rollback** — undo any change or entire session back to the captured before-state
- **Compliance engine** — 36 controls mapped to OWASP, RGPD, ISO 27001, CWE, SLSA
- **Universal MCP** — works with every major AI editor out of the box via MCP server

No other tool enforces governance across the full agentic development lifecycle. DevControl fills that gap.

---

## Install

```bash
npm install -g sp-devcontrol
```

### Standalone binary (no Node.js required)

```bash
# Linux x64
curl -L https://github.com/PRojas01/sp-devcontrol/releases/latest/download/devcontrol-linux-x64 -o devcontrol
chmod +x devcontrol && sudo mv devcontrol /usr/local/bin/

# Linux ARM64
curl -L https://github.com/PRojas01/sp-devcontrol/releases/latest/download/devcontrol-linux-arm64 -o devcontrol
chmod +x devcontrol && sudo mv devcontrol /usr/local/bin/

# Windows x64 — download devcontrol-win-x64.exe from the Releases page
```

---

## Quickstart

```bash
# 1. Initialize governance in your project
cd my-project
sp-devcontrol init --project-name my-project

# 2. Inject config into your editor (CLAUDE.md, .cursorrules, opencode.json...)
sp-devcontrol inject

# 3. Approve the design gate before any agent starts coding
sp-devcontrol gate:approve --phase design --by "Your Name" --notes "architecture reviewed"

# 4. Start a governed session
sp-devcontrol session:start --objective "implement login feature"

# 5. Monitor all file changes in real time (separate terminal)
sp-devcontrol watch:start --session ds-YYYYMMDD-001

# 6. Approve or reject each change the agent makes
sp-devcontrol session:change:approve --change-id <id>
sp-devcontrol session:change:reject  --change-id <id>

# 7. Approve the review gate before any git push
sp-devcontrol gate:approve --phase review --by "Your Name"

# 8. Generate a compliance report
sp-devcontrol report:compliance

# 9. Close the session
sp-devcontrol session:close --session ds-YYYYMMDD-001
```

---

## Human Authorization Gates

Gates are the core of DevControl's human-in-the-loop model. Every project has four gates that must be explicitly approved by a human before proceeding to the next phase.

```
design ──► development ──► review ──► publish
  🟡              🟡           🟡         🟡
 (pending)     (pending)   (pending)  (pending)
```

### Gate phases

| Phase | Meaning | Effect when not approved |
|-------|---------|--------------------------|
| `design` | Architecture and requirements reviewed | Agent sees warning in CLAUDE.md |
| `development` | Development actively authorized | Sessions can start with warning |
| `review` | Code reviewed, ready for push | `git push` blocked by pre-push hook |
| `publish` | Ready for production release | `npm publish`, `vsce publish` flagged as REVIEW |

### Gate commands

```bash
# Show current gate states
sp-devcontrol gate:status

# Approve a phase
sp-devcontrol gate:approve --phase design --by "Pedro" --notes "architecture reviewed"
sp-devcontrol gate:approve --phase development --by "Pedro"
sp-devcontrol gate:approve --phase review --by "Pedro" --notes "code review passed"
sp-devcontrol gate:approve --phase publish --by "Pedro" --notes "all tests green"

# Block a phase (halt progress)
sp-devcontrol gate:reject --phase publish --reason "failing tests on CI"

# Request approval (shows the exact command the reviewer needs to run)
sp-devcontrol gate:request --phase review

# Reset a gate to pending
sp-devcontrol gate:reset --phase review
```

### Gate status visible in your editor

After running `sp-devcontrol inject`, your `CLAUDE.md` shows the live gate table at the top:

```markdown
## ⚙ Human Authorization Gates

| Phase       | Status      | Approved By | Notes                 |
|-------------|-------------|-------------|-----------------------|
| design      | ✅ OPEN     | Pedro       | architecture reviewed |
| development | ✅ OPEN     | Pedro       |                       |
| review      | 🟡 PENDING  | —           | —                     |
| publish     | ⛔ BLOCKED  | —           | failing CI            |

> AGENT RULE: Stop and request human approval before crossing a gate boundary.
> Check gates:       sp-devcontrol gate:status
> Request approval:  sp-devcontrol gate:request --phase <phase>
```

Every AI editor that reads `CLAUDE.md` or `.cursorrules` sees this. Re-run `inject` after each gate change to refresh.

---

## Editor Integration

Run `sp-devcontrol inject` once to generate all editor config files for your project:

| File generated | Read by |
|----------------|---------|
| `CLAUDE.md` | Claude Code |
| `.cursorrules` | Cursor |
| `.windsurfrules` | Windsurf |
| `.devcontrol/injected/copilot-instructions.md` | GitHub Copilot |
| `opencode.json` | opencode |
| `.cursor/mcp.json` | Cursor (MCP) |
| `.windsurf/mcp.json` | Windsurf (MCP) |

### Claude Code

```bash
# MCP server via stdio (no daemon needed)
claude mcp add devcontrol -- sp-devcontrol mcp:stdio
```

Or add to `.claude/mcp.json`:
```json
{
  "mcpServers": {
    "devcontrol": { "type": "sse", "url": "http://localhost:7893/mcp" }
  }
}
```

### opencode

`sp-devcontrol inject` generates `opencode.json` with the MCP server entry. To configure your AI provider, add an `inference` section to `.devcontrol/config.json`:

```json
{
  "inference": {
    "providerName": "my-ollama",
    "baseURL": "http://localhost:11434/v1",
    "apiKey": "ollama",
    "model": "my-ollama/qwen2.5-coder:7b"
  }
}
```

### Cursor / Windsurf

`sp-devcontrol inject` writes `.cursorrules`, `.windsurfrules`, and the MCP config files. Open your project and the rules apply automatically.

---

## Policy Engine

### Command policy — three tiers

```bash
# BLOCK — command is always rejected
# (git reset --hard, rm -rf /, DROP TABLE are blocked by default)

# REVIEW — agent must request human approval before running
sp-devcontrol policy:command:review:add    --command "git push"
sp-devcontrol policy:command:review:list
sp-devcontrol policy:command:review:remove --command "git push"

# ALLOW — command is explicitly approved
sp-devcontrol policy:command:approve --command "npm run deploy:staging"
sp-devcontrol policy:command:revoke  --command "npm run deploy:staging"

# Evaluate any command
sp-devcontrol policy:command --command "git push origin main"
# → REVIEW: Command matches review pattern: git push
```

### Protected paths

```bash
sp-devcontrol policy:protected:add    --pattern "src/auth/**"
sp-devcontrol policy:protected:list
sp-devcontrol policy:protected:remove --pattern "src/auth/**"

sp-devcontrol policy:path --path "src/auth/login.ts"
# → HIGH risk, protected, approval required
```

### Default blocked commands

`git reset --hard` · `git push --force` · `git push -f` · `rm -rf /` · `rm -rf ~` · `chmod 777` · `sudo rm -rf` · `DROP TABLE` · `TRUNCATE` · `eval $(curl` · `curl | bash`

### Default review commands

`git push` · `npm publish` · `npx publish` · `pnpm publish` · `vsce publish` · `docker push` · `kubectl apply` · `kubectl delete` · `terraform apply` · `terraform destroy`

---

## Session Workflow

```bash
# Start session
sp-devcontrol session:start \
  --objective "Add payment integration" \
  --agent claude-code \
  --mode watch

# Watch file changes (separate terminal)
sp-devcontrol watch:start --session ds-20260626-001

# List detected changes
sp-devcontrol session:changes:list --session ds-20260626-001

# Approve a change (interactive TUI)
sp-devcontrol session:change:approve --change-id <id>

# Approve without TUI — for CI or non-interactive environments
sp-devcontrol session:change:approve --change-id <id> --yes --message "approved in CI"

# Reject and rollback a change
sp-devcontrol session:change:reject --change-id <id>

# Close session
sp-devcontrol session:close --session ds-20260626-001
```

---

## Snapshots and Rollback

DevControl captures the before-state of every file before a change is applied.

```bash
# Create a manual snapshot
sp-devcontrol snapshot:create --session <id> --label "before-refactor"

# List snapshots
sp-devcontrol session:snapshots:list --session <id>

# Rollback one change to its before-state
sp-devcontrol session:rollback --session <id> --change-id <change-id>

# Rollback entire session (restores earliest before-state per file)
sp-devcontrol session:rollback --session <id>
```

Rollback safety guarantees:
- New files (`snapshotBefore = ''`) are deleted on rollback
- Path traversal outside project root is blocked and throws
- Partial rollbacks skip missing files and continue

---

## Compliance Reports

36 controls mapped to OWASP A01–A10, RGPD Art. 25/32, ISO 27001, CWE, and SLSA.

```bash
sp-devcontrol report:compliance
sp-devcontrol report:session --session <id>
```

Control categories: `security` · `privacy` · `architecture` · `commits` · `testing` · `documentation` · `memory`

---

## Git Hooks

```bash
# Install hooks (pre-commit, pre-push, commit-msg)
sp-devcontrol hooks:install

# The pre-push hook:
#   - blocks push if there are open unresolved sessions
#   - warns if the review gate is not approved
#   - shows a DevControl status banner

sp-devcontrol hooks:status
sp-devcontrol hooks:uninstall
```

---

## MCP Server

DevControl exposes a Model Context Protocol server compatible with all MCP clients.

```bash
# stdio mode (Claude Code)
sp-devcontrol mcp:stdio

# HTTP/SSE mode (Cursor, Windsurf, opencode, port 7893)
sp-devcontrol mcp:serve --port 7893
```

MCP tools exposed: `get_policy` · `evaluate_command` · `evaluate_path` · `get_session` · `list_changes` · `get_compliance`

---

## Daemon Mode

```bash
# Start background daemon (REST API on :7891 + MCP on :7893)
sp-devcontrol daemon

# Health check
curl http://localhost:7891/health

# API (Bearer token required)
curl -H "Authorization: Bearer $(cat .devcontrol/api-token)" \
     http://localhost:7891/api/policy
```

---

## Configuration

```json
{
  "project": "my-project",
  "version": "1.0.0",
  "stack": ["typescript", "node"],
  "agents": {
    "allowed": ["claude-code", "opencode", "cursor", "windsurf"],
    "default": "claude-code"
  },
  "scope": {
    "allowed": ["src/", "tests/", "docs/"],
    "protected": ["src/auth/", ".env", ".devcontrol/"]
  },
  "controls": {
    "security": ["sec-secrets", "sec-sqli", "sec-cmd", "sec-xss", "sec-deps"],
    "privacy": ["priv-pii", "priv-logging"],
    "commits": ["vcs-conv-commits"]
  },
  "inference": {
    "providerName": "my-ollama",
    "baseURL": "http://localhost:11434/v1",
    "apiKey": "ollama",
    "model": "my-ollama/qwen2.5-coder:7b"
  }
}
```

---

## Project Health Check

```bash
sp-devcontrol project:check
# Checks: git present · docs written · policy configured
#         baseline snapshot · agent config injected · gate states

sp-devcontrol project:status
# Shows: project name, phase, session count, last session, gate table
```

---

## Storage

```bash
# JSON files (default — zero dependencies, portable, human-readable)
sp-devcontrol storage:backend json

# SQLite (better for large projects with many sessions)
sp-devcontrol storage:backend sqlite
```

---

## Full Command Reference

```
init --project-name              Initialize DevControl in a project

gate:status                      Show authorization gate states
gate:approve --phase --by        Approve a phase gate
gate:reject  --phase --reason    Block a phase gate
gate:reset   --phase             Reset gate to pending
gate:request --phase             Show approval instructions

policy:path --path               Evaluate path risk level
policy:command --command         Evaluate command risk (ALLOW/REVIEW/BLOCK)
policy:protected:list/add/remove Manage protected path patterns
policy:command:approved:list     List approved commands
policy:command:approve/revoke    Manage approved commands
policy:command:review:list/add/remove  Manage review commands

session:start --objective        Start a governed session
session:check                    Token usage / context refresh
session:changes:list             List detected changes
session:change:show              Show one change detail
session:change:approve [--yes]   Approve change (TUI or --yes for CI)
session:change:reject            Reject and rollback a change
session:close                    Close session
session:rollback [--change-id]   Rollback change or full session
session:snapshots:list           List session snapshots
session:approval:list/grant/revoke  Manage session-scoped approvals

snapshot:create --label          Create manual snapshot

hooks:install/uninstall/status   Manage git hooks

inject                           Generate CLAUDE.md, .cursorrules, opencode.json...
skill:generate [--editor]        Generate skill/tool files

report:compliance                Full compliance report
report:session --session         Per-session detailed report

daemon                           Start background REST+MCP daemon
mcp:serve [--port]               Start MCP HTTP/SSE server
mcp:stdio                        Start MCP stdio server (Claude Code)

storage:backend json|sqlite      Set storage backend
agent:run --agent --objective    Run agent in governed sandbox
project:status                   Show local governance status
project:check                    Run preflight checks
```

---

## Testing

```bash
npm test              # 115 tests, 18 files
npm run typecheck     # TypeScript strict, 0 errors
npm run build         # Compile TypeScript → dist/
npm run test:watch    # Watch mode
```

---

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure process.

Security invariants (do not revert):
- `commandMatches()` — exact token prefix matching, not `.includes()` (prevents bypass)
- `resolve()+startsWith(root+'/')` — path traversal blocked in both policy and snapshot
- Bearer token required on all API and MCP endpoints except `/health`
- Per-project DB isolation in the MCP server via `mcpDbCache` Map
- Atomic daemon lock via `openSync(LOCK_PATH, 'wx')` — prevents duplicate daemons

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing guidelines, and pull request process.

---

## License

MIT © 2026 Pedro Rojas — SolucionesPro

*SP-DevControl v2.1.0 — Built for teams that want humans in the loop.*
