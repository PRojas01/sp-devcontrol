# Handoff — SP-DevControl v2

**Fecha:** 2026-06-25 | **Sesión:** ds-20260625-001 (production loop)

## Leer primero
1. `docs/CLUSTER_CONTRACTS.md` — puertos, URLs, firmas de funciones
2. `.devcontrol/memory/project_summary.md` — estado del proyecto

## Pendiente prioritario

### Tests para módulos nuevos
- [ ] tests/daemon.test.ts — startDaemon/stop/getStatus con temp dirs
- [ ] tests/api.test.ts — 10 endpoints con supertest
- [ ] tests/mcp.test.ts — 6 tools MCP con mocks

### Binarios standalone
- [ ] `bash scripts/install-deps-cluster.sh` — Node 20 en workers
- [ ] `bash scripts/build-binaries.sh` — linux-x64, win-x64, linux-arm64
- [ ] `bash scripts/deploy-cluster.sh` — instalar en 6 nodos

### Mejoras de robustez identificadas
- [ ] api.ts: leer version de package.json dinámicamente
- [ ] api.ts: db singleton multi-proyecto concurrente
- [ ] daemon.ts: cerrar logFd si spawn falla
- [ ] mcp.ts: X-Project-Path header para multi-proyecto

### Siguiente sprint
- [ ] better-sqlite3 como backend de storage
- [ ] Feature flag json/sqlite en config

## Reglas para constructor
1. Leer CLUSTER_CONTRACTS.md antes de cualquier módulo
2. No cambiar puertos: 7891 / 7892 / 7893
3. `npm test && npm run build` antes de cerrar sesión
