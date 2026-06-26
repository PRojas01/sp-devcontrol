# Changelog

All notable changes to SP-DevControl are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0] — 2026-06-26

### Added

- **Human Authorization Gates** — four-phase lifecycle control (design → development → review → publish). Each gate requires explicit human sign-off before agents can proceed
- `gate:status` — show live gate states for the current project
- `gate:approve --phase --by [--notes]` — approve a phase gate with author and optional notes
- `gate:reject --phase --reason` — block a phase with a reason
- `gate:reset --phase` — return a gate to pending
- `gate:request --phase` — print the exact command a reviewer needs to run
- Gates table embedded in `CLAUDE.md` via `inject` — all editors see live gate status
- `initGates()` called automatically on `init` — all projects start with 4 pending gates
- Pre-push hook warns when review gate is not approved
- `reviewCommands` policy tier — REVIEW decisions sit between ALLOW and BLOCK
- `--yes` flag for `session:change:approve` — non-interactive CI mode
- `validateEditorConfig()` preflight in `agent:run`
- `DevSentinelConfig.inference` — optional per-project AI endpoint configuration
- Rollback edge-case tests: new-file deletion, path traversal block, empty session, partial multi-file
- 8 gate tests (93 total passing, 16 test files)

### Changed

- `inject` now embeds live gate state table at top of `CLAUDE.md`
- `buildOpencodeJson()` is now generic — uses `config.inference` when set, otherwise generates minimal MCP-only config (no hardcoded provider URLs)
- README: complete rewrite with gates, all commands, editor integration, rollback docs, compliance reference

### Fixed

- `sanitizeProcessData()` changed from `any` to `unknown` with required-field guard
- Pre-push hook: now warns (not blocks) on review gate pending to avoid false blockers during initial setup

## [2.0.0] — 2026-06-25

### Added

- Governance engine: 37 CLI commands for managing AI-assisted development
- Session lifecycle: start, check, close with full audit trail
- Change management: detect, classify, approve, reject changes with rollback
- Real-time file monitoring via Chokidar with burst processing
- Policy engine: protected paths, command risk evaluation, 3-tier decisions
- Preflight checks: quality gates, phase detection, documentation validation
- Compliance reporting: 36 controls mapped to OWASP, RGPD, ISO 27001, CWE, SLSA
- Snapshot system: manual snapshots and automatic pre-approval capture
- Git hooks: auto-install cross-platform hooks (Linux + Windows)
- MCP server: stdio + HTTP/SSE on :7893 with 6 tools
- REST API: Express server on :7891 with 10 endpoints
- Daemon mode: background process with PID file, SIGTERM/taskkill
- Token auth: API and MCP authentication with local token
- Skill generation: auto-config for Claude Code, Cursor, Windsurf, opencode, Copilot
- Standalone binaries: 53MB Linux x64/ARM64 + Windows x64 via pkg
- Cross-platform: full Windows support (paths, signals, hooks)

### Infrastructure

- TypeScript strict mode, ESM modules
- 76 unit tests with Vitest across 15 test files
- JSON storage with atomic writes and automatic recovery
- Memory management: context scanning, token budgets, redaction
- Documentation generator: 14 templates for project docs

## [1.0.0] — 2026-03-15

### Added

- Initial CLI structure with Commander.js
- Basic policy evaluation for paths and commands
- Project initialization and configuration
- Git integration via simple-git

[2.0.0]: https://github.com/PRojas01/sp-devcontrol/releases/tag/v2.0.0
[1.0.0]: https://github.com/PRojas01/sp-devcontrol/releases/tag/v1.0.0
