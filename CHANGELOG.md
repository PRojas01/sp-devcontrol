# Changelog

All notable changes to SP-DevControl are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

[2.0.0]: https://github.com/SolucionesPro/sp-devcontrol/releases/tag/v2.0.0
[1.0.0]: https://github.com/SolucionesPro/sp-devcontrol/releases/tag/v1.0.0
