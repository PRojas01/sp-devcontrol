# SP-DevControl - Resumen del Proyecto

## Estado actual
- Estado general: MVP tecnico COMPLETADO.
- Marca oficial: SP-DevControl.
- App local: SP-DevControl Local.
- Binario actual: sp-devcontrol.
- Nombre historico del prototipo: DevSentinel.

## Propuesta del producto
- Capa local de control para proyectos desarrollados con editores agenticos.
- No reemplaza el editor; gobierna entorno, cambios, riesgo, auditoria, snapshots, aprobaciones y contexto.
- Impone diseño primero: no permite iniciar sesiones de desarrollo sin documentacion de diseño completada.

## Stack objetivo final
- Tauri
- Rust
- React
- TypeScript
- SQLite

## Runtime actual del prototipo
- Node.js
- TypeScript
- Commander
- Chokidar
- simple-git
- JSON local como backend portable en lugar de SQLite real

## Estado de implementacion actual
- 33 comandos CLI operativos.
- Preflight y quality gates que bloquean desarrollo sin diseño.
- Git hooks (pre-commit, pre-push, commit-msg) con enforcement real.
- Inyeccion de reglas a editores (CLAUDE.md, .cursorrules, copilot-instructions).
- Reportes de compliance con mapeo a normas (OWASP, RGPD, ISO, SLSA, CWE).
- 36 controles en catalogo, 14+ activos por defecto con validadores.
- Sesiones gobernadas con checklist, aprobaciones y snapshots.
- Monitoreo de cambios con clasificacion de riesgo.
- Rollback por cambio y por sesion.
- 19 tests automatizados pasando.

## Capacidades CLI ya disponibles (33 comandos)
- init, project:status, project:check
- policy:path, policy:command, policy:protected:list/add/remove
- policy:command:approved:list, policy:command:approve, policy:command:revoke
- session:start (con preflight), session:check, session:checklist:update, session:close
- session:changes:list, session:change:show, session:change:approve, session:change:reject
- session:approval:list, session:approval:grant, session:approval:revoke
- snapshot:create, session:snapshots:list, session:rollback
- watch:start
- hooks:install, hooks:uninstall, hooks:status
- inject
- report:compliance, report:session

## Proximo foco recomendado
- Optimizacion real de tokens (integracion con APIs de proveedores).
- Migracion de JSON a SQLite.
- Comando `launch` para lanzar editores desde SP-DevControl.
- Daemon local como proceso de background.
- Desktop app con Tauri + React.
