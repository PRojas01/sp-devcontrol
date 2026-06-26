# SP-DevControl v2.0.0 — Agent Instructions

**Repository:** https://github.com/SolucionesPro/sp-devcontrol
**License:** MIT

## Project Overview

Local governance layer for AI-assisted software development. Works with any agentic editor (Claude Code, Cursor, Windsurf, GitHub Copilot, opencode, Codex). Provides policy enforcement, approval gates, audit trails, and compliance reporting for any project where AI agents write code.

37 CLI commands · REST API (:7891) · MCP server (:7893) · daemon mode · 36 controls (OWASP/RGPD/ISO 27001/CWE/SLSA) · standalone binaries Linux/Windows

## Tech Stack

- **Runtime:** Node.js ≥ 18 (TypeScript ESM strict)
- **CLI:** Commander.js (37 commands)
- **Storage:** JSON portable (default) + SQLite (feature flag via `storageBackend`)
- **API:** Express 4 on :7891 — Bearer token required (except /health)
- **MCP:** @modelcontextprotocol/sdk on :7893 (stdio + HTTP/SSE) — Bearer token required
- **Build:** tsc + esbuild + @yao-pkg/pkg (node18 targets)
- **Test:** Vitest — 85 passing, 15 files

## Key Constraints

1. **Never delete files** — create new versions instead
2. **Ports are immutable** — 7891 (API), 7892 (WS), 7893 (MCP), endpoint always `/mcp`
3. **Token auth** — `commandMatches()` for policy, `resolve()+startsWith()` for paths
4. **No .includes() for command matching** — always use `commandMatches()` in policy.ts
5. **Paths outside projectRoot** — always `protected=true, risk=HIGH`
6. **Read handoff** — `.devcontrol/memory/next_session_handoff.md` at the start of each session

## Security invariants (do NOT revert)

- `commandMatches()` in policy.ts — exact token match, not substring
- `resolve()+startsWith(root+'/')` in policy.ts and snapshot.ts — path traversal blocked
- `buildAuthMiddleware()` in api.ts — Bearer token, except /health
- `mcpDbCache` Map in mcp.ts — per-project DB isolation
- Token at `~/.devcontrol/api-token` chmod 600 — generated on daemon start
- `openSync(LOCK_PATH,'wx')` in daemon.ts — atomic TOCTOU-safe lock

## Testing

```bash
npm run typecheck   # TypeScript check
npm test            # 85 tests, 15 files
npm run test:watch  # Watch mode
```

## Build

```bash
npm run build       # TypeScript → dist/
npm run pkg:all     # Standalone binaries Linux/Windows (requires dist/ first)
```

## Local editor config (NOT committed)

`opencode.json`, `.mcp.json`, `.cursor/mcp.json`, `.windsurf/mcp.json` are gitignored — they are user-specific. Run `sp-devcontrol inject` inside any governed project to regenerate them.

## Author

Pedro Rojas — SolucionesPro
MIT License — see LICENSE file
