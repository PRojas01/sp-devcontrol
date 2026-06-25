# Arquitectura — SP-DevControl

## Stack actual (MVP)
- **Runtime**: Node.js ≥ 20
- **Lenguaje**: TypeScript (ESM, strict)
- **CLI**: Commander.js
- **Monitoreo**: Chokidar (polling en Windows, eventos en Linux)
- **Git**: simple-git
- **Storage**: JSON portable con escritura atómica (.devcontrol/storage/)
- **UI terminal**: chalk, boxen, cli-table3, inquirer

## Módulos del sistema

| Módulo | Archivo | Responsabilidad |
|---|---|---|
| CLI Entry | cli.ts | 33 comandos, routing, error handling |
| Config | config.ts | Carga, merge y persistencia de configuración |
| Storage | storage.ts | Backend JSON portable con escritura atómica y recuperación |
| Policy | policy.ts | Motor de políticas: rutas protegidas, comandos, riesgo |
| Watcher | watcher.ts | Monitoreo de archivos con burst processing |
| Monitor | monitor.ts | Procesamiento de cambios, clasificación de riesgo |
| Analyzer | analyzer.ts | Análisis de scope, dependencias y riesgo |
| Snapshot | snapshot.ts | Captura de estado y rollback por cambio/sesión |
| Session | session.ts | Generación de ID y creación de sesiones |
| Preflight | preflight.ts | Quality gates, detección de fase, validación de docs |
| Hooks | hooks.ts | Instalación/gestión de Git hooks (pre-commit, pre-push, commit-msg) |
| Injector | injector.ts | Generación de reglas para editores agénticos |
| Compliance | compliance.ts | Reportes con mapeo controles-normas |
| Validator | validator.ts | Ejecución de validadores de controles |
| Controls | catalog/controls.ts | 36 controles en 8 categorías |
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

## Arquitectura objetivo (v2.0)
- **Desktop**: Tauri (Rust backend + React frontend)
- **Storage**: SQLite con migraciones
- **Daemon**: Proceso de background para monitoreo continuo
- **UI**: Panel visual de sesiones, cambios y aprobaciones

## Integraciones
- Claude Code (CLAUDE.md)
- Cursor (.cursorrules)
- GitHub Copilot (copilot-instructions.md)
- Windsurf (.windsurfrules)
