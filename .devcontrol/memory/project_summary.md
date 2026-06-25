# SP-DevControl v2 — Resumen del Proyecto

## Estado actual (2026-06-25)
- Versión: **2.0.0** (production loop activo)
- Build: ✅ 0 errores TypeScript, 32 módulos
- Tests: ✅ 19/19 pasando
- Sesión activa: ds-20260625-001 (auto-aprobación)

## Propuesta del producto
Capa local de gobernanza para proyectos con editores agénticos.
Gobierna entorno, cambios, riesgo, auditoría, snapshots, aprobaciones y contexto.
Impone diseño primero. Bloquea sesiones sin documentación completa.

## Novedades v2 vs v1
| Componente | v1 | v2 |
|---|---|---|
| CLI commands | 33 | 37 |
| Daemon | No | ✅ daemon.ts — PID file, SIGTERM/taskkill |
| REST API | No | ✅ api.ts Express :7891, 10 endpoints |
| MCP Server | No | ✅ mcp.ts stdio + HTTP/SSE :7893, 6 tools |
| Skill generator | No | ✅ skill.ts — 5 editores, deepMerge JSON |
| Binary scripts | No | ✅ @yao-pkg/pkg — linux/win/arm |
| Cluster deploy | No | ✅ deploy-cluster.sh — 6 nodos SSH |
| opencode.json | Básico | ✅ Con MCP + cluster config |
| .cursor/mcp.json | No | ✅ Generado automáticamente |
| .windsurf/mcp.json | No | ✅ Generado automáticamente |
| Node requerido | ≥20 | ≥18 |
| Auto-gobernanza | No | ✅ Se rige por sí mismo |

## Stack v2
- Runtime: Node.js ≥ 18 | TypeScript 5.7 ESM strict
- CLI: Commander.js | Storage: JSON portable (→ SQLite próximo sprint)
- REST API: Express 4 | MCP: @modelcontextprotocol/sdk 1.13
- Packaging: @yao-pkg/pkg | Tests: Vitest 3

## Puertos fijos (ver CLUSTER_CONTRACTS.md)
- API REST: 7891 | MCP HTTP: 7893 | WebSocket: 7892
