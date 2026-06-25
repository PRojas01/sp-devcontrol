# SP-DevControl v2.0.0 — Agent Instructions

**Author:** Pedro Rojas — SolucionesPro (Ecuador)
**License:** MIT
**Repository:** https://github.com/SolucionesPro/sp-devcontrol

## Project Overview

Local governance layer for AI-assisted software projects. 38 CLI commands, REST API, MCP server, daemon mode, compliance engine (36 controls mapped to OWASP/RGPD/ISO 27001/CWE/SLSA), standalone binaries for Linux/Windows.

## Tech Stack

- **Runtime:** Node.js ≥ 18 (TypeScript ESM strict)
- **CLI:** Commander.js
- **Storage:** JSON portable + SQLite
- **API:** Express 4 on :7891
- **MCP:** @modelcontextprotocol/sdk on :7893 (stdio + HTTP/SSE)
- **Build:** tsc + esbuild + @yao-pkg/pkg
- **Test:** Vitest

## Key Constraints

1. **Never delete files** — create new versions instead
2. **Always version changes** — describe what changed and why
3. **Await approval** — present changes before applying
4. **Design first** — complete docs/ before writing code
5. **Respect protected paths** — src/auth, .env, config files

## Testing

```bash
npm run typecheck   # TypeScript check
npm test            # Run all tests
npm run test:watch  # Watch mode
```

## Build

```bash
npm run build       # TypeScript compilation
npm run pkg:all     # Build standalone binaries
```

## Author

Pedro Rojas — SolucionesPro, Ecuador
MIT License — see LICENSE file
