# SP-DevControl v2.0.0 — Agent Instructions

**Author:** Pedro Rojas — SolucionesPro (Ecuador)
**License:** MIT
**Repository:** https://github.com/SolucionesPro/sp-devcontrol

## Project Overview

Local governance layer for AI-assisted software projects. 37 CLI commands, REST API (:7891), MCP server (:7893), daemon mode, compliance engine (36 controls: OWASP/RGPD/ISO 27001/CWE/SLSA), standalone binaries Linux/Windows.

## Tech Stack

- **Runtime:** Node.js ≥ 18 (TypeScript ESM strict)
- **CLI:** Commander.js (37 commands)
- **Storage:** JSON portable (default) + SQLite (feature flag via `storageBackend`)
- **API:** Express 4 on :7891 — Bearer token required (except /health)
- **MCP:** @modelcontextprotocol/sdk on :7893 (stdio + HTTP/SSE) — Bearer token required
- **Build:** tsc + esbuild + @yao-pkg/pkg (node18 targets)
- **Test:** Vitest — 76/76 passing, 15 files

## Modo local — Operación sin internet

Este proyecto opera en modo local por defecto. **No se necesita internet para desarrollar.**

- `npm test` — local
- `npm run build` / `npm run typecheck` — local
- `git add / commit / log / status / diff` — local
- `node dist/cli.js <cmd>` — local
- **Solo requieren internet:** `git push`, `git pull`, `npm publish`, `npm install` (paquetes nuevos)

Antes de ejecutar cualquier operación que requiera red, verificar conectividad:
```bash
ping -c 1 8.8.8.8 2>/dev/null && echo "RED OK" || echo "SIN RED — operar en modo local"
```

Si no hay red: continuar con commits locales y anotar el push como pendiente en `.devcontrol/memory/next_session_handoff.md`.

## Cluster RedIA (red local — siempre disponible)

```
Master:  192.168.18.100  (Node v24, Claude Code)
Workers: 192.168.18.101-106  (Node v18.19.1, user: worker)
```

Acceso SSH al cluster funciona sin internet (red local 192.168.18.x):
```bash
ssh worker@192.168.18.101 "devcontrol --version"
```

LLMs locales (también sin internet):
```bash
curl http://localhost:11434/api/tags        # Ollama (18 modelos)
curl http://127.0.0.1:8090/v1/models       # Smart Router
curl http://127.0.0.1:8091/v1/models       # IDE Bridge
```

## Key Constraints

1. **Never delete files** — create new versions instead
2. **Puertos inmutables** — 7891 (API), 7892 (WS), 7893 (MCP), endpoint siempre `/mcp`
3. **Token auth** — `commandMatches()` para policy, `resolve()+startsWith()` para paths
4. **Design first** — leer `docs/CLUSTER_CONTRACTS.md` antes de coordinar con cluster
5. **Leer handoff** — `.devcontrol/memory/next_session_handoff.md` al inicio de cada sesión
6. **No usar .includes() para matching de comandos** — usar `commandMatches()` en policy.ts
7. **Paths fuera de projectRoot** — siempre `protected=true, risk=HIGH` (no ignorar)

## Estado actual (2026-06-25)

- Tests: 76/76 | TypeScript: 0 errores | Seguridad: 8 vulns RedTeam cerradas
- Git: 3 commits listos — push pendiente (requiere red)
- Próximo: `git push -u origin master` → `git tag v2.0.0` → `git push origin v2.0.0`
- Ver: `docs/05-publish-guide.md` para el proceso completo

## Testing

```bash
npm run typecheck   # TypeScript check
npm test            # 76 tests, 15 archivos
npm run test:watch  # Watch mode
```

## Build

```bash
npm run build       # TypeScript → dist/
npm run pkg:all     # Binarios standalone Linux/Windows (requiere dist/ previo)
```

## Author

Pedro Rojas — SolucionesPro, Ecuador
MIT License — see LICENSE file
