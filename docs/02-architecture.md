# Arquitectura — SP-DevControl

## Stack v2.0 (actual)
- **Runtime**: Node.js ≥ 18
- **Lenguaje**: TypeScript (ESM, strict)
- **CLI**: Commander.js (37 comandos)
- **Monitoreo**: Chokidar (polling Windows, eventos Linux)
- **Git**: simple-git
- **Storage**: JSON portable con escritura atómica (.devcontrol/storage/) + SQLite
- **REST API**: Express 4 en :7891 (daemon mode)
- **MCP Server**: @modelcontextprotocol/sdk — stdio + HTTP/SSE en :7893
- **Distribución**: @yao-pkg/pkg → binarios standalone Linux/Windows de 53MB
- **UI terminal**: chalk, boxen, cli-table3, inquirer

## Puertos fijos (no modificar)

| Servicio | Puerto | Scope |
|---|---|---|
| REST API | 7891 | localhost |
| MCP HTTP | 7893 | localhost |

## Módulos del sistema

| Módulo | Archivo | Responsabilidad |
|---|---|---|
| CLI Entry | cli.ts | 37 comandos, daemon worker mode, routing |
| Config | config.ts | Carga, merge y persistencia de configuración |
| Storage | storage.ts | Backend JSON portable con escritura atómica y recuperación |
| Policy | policy.ts | Motor de políticas: rutas protegidas, comandos, riesgo |
| Watcher | watcher.ts | Monitoreo de archivos con burst processing |
| Monitor | monitor.ts | Procesamiento de cambios, clasificación de riesgo |
| Analyzer | analyzer.ts | Análisis de scope, dependencias y riesgo |
| Snapshot | snapshot.ts | Captura de estado y rollback por cambio/sesión |
| Session | session.ts | Generación de ID y creación de sesiones |
| Preflight | preflight.ts | Quality gates, detección de fase, validación de docs |
| Hooks | hooks.ts | Instalación/gestión de Git hooks cross-platform |
| Injector | injector.ts | Generación de reglas para 5 editores + MCP configs |
| Compliance | compliance.ts | Reportes con mapeo a 5 normas internacionales |
| Validator | validator.ts | Ejecución de validadores de controles |
| Controls | catalog/controls.ts | 36 controles en 8 categorías |
| **Daemon** | **daemon.ts** | **Proceso background: PID file, SIGTERM/taskkill cross-platform** |
| **API** | **api.ts** | **REST API Express — 10 endpoints, CORS localhost** |
| **MCP** | **mcp.ts** | **Servidor MCP — 6 tools, stdio + HTTP/SSE** |
| **Skill** | **skill.ts** | **Generador de skills/tools para 5 editores con deepMerge JSON** |
| Git | git.ts | Wrapper de simple-git para commits, branches, stash |
| Platform | platform.ts | Utilidades cross-platform (chmod, paths, signals) |
| Memory | memory.ts | Gestión de contexto, índices y resúmenes |
| Token Guard | token_guard.ts | Estimación de tokens y alertas de presupuesto |
| Wrapper | wrapper.ts | Ejecución sandbox de agentes |
| Diff | diff.ts | Generación y conteo de diffs |
| Paths | paths.ts | Constantes de rutas del sistema |
| Project Init | project_init.ts | Inicialización de estructura del proyecto |
| Session Files | session_files.ts | Artefactos de sesión en disco |

## Modelo de datos
Almacenamiento en JSON con las colecciones: sessions, changes, sessionRequests, sessionChecklists, memoryEntries, dailyLogs, approvals, snapshots. Escritura atómica via archivo temporal + rename. Backup automático (.bak) al abrir.

## Flujo de datos
1. `init` → crea estructura, config, docs, policy, hooks
2. `project:check` → preflight detecta fase y blockers
3. `session:start` → valida preflight → crea sesión + checklist
4. `watch:start` → monitorea archivos → burst → análisis → riesgo → almacena
5. `session:change:approve/reject` → snapshot → decisión → commit/rollback
6. `session:close` → cierra sesión → actualiza artefactos
7. `report:compliance` → genera evidencia normativa

## Roadmap

### v2.1 — En desarrollo
- **Desktop**: Tauri (Rust backend + React frontend)
- **Storage**: SQLite como storage primario (JSON como fallback)
- **UI**: Panel visual de sesiones, cambios y aprobaciones
- **WebSocket**: ws en :7892 para notificaciones en tiempo real

## Integraciones
- Claude Code (CLAUDE.md + MCP)
- Cursor (.cursorrules + MCP)
- opencode (opencode.json + MCP)
- GitHub Copilot (copilot-instructions.md + MCP)
- Windsurf (.windsurfrules + MCP)

### Protocolo MCP
El servidor MCP en :7893 es el mecanismo de integración universal.
Soporta modo stdio (para editores agénticos) y HTTP/SSE (para herramientas externas).
6 tools expuestas: project:status, session:[start|check|close], change:[approve|reject].
\n---\n_SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License_
