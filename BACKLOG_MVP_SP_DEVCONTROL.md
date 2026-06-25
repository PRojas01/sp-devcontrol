# BACKLOG MVP SP-DEVCONTROL

## Criterios generales
- Todas las tareas deben ejecutarse como sesion gobernada.
- Ninguna historia se considera terminada sin evidencia verificable.
- Prioridad MVP: control previo, contexto persistente, auditoria y riesgo.
- No se permite iniciar sesion de desarrollo sin documentacion de diseño completada.

## Estado de avance por epica (actualizado 2026-06-15)

| Epica | Estado | Completado |
|---|---|---|
| 1. Inicializacion de proyecto controlado | Completo | 100% |
| 2. Gobierno de sesion | Completo | 100% |
| 3. Motor de politicas minimo | Completo | 100% |
| 4. Memoria local y ahorro de tokens | Completo | 100% |
| 5. Auditoria portable | Completo | 100% |
| 6. Quality Gates y Preflight | Completo | 100% |
| 7. Git Hooks y Enforcement | Completo | 100% |
| 8. Inyeccion de reglas a editores | Completo | 100% |
| 9. Compliance y reportes | Completo | 100% |
| 10. Produccion y cross-platform | Completo | 100% |

---

## Epica 1. Inicializacion de proyecto controlado — COMPLETADA
### Tareas completadas
- [x] Comando `init` con generacion de config, docs, baseline, policy y protected paths.
- [x] Validacion de existencia de `.git`.
- [x] Generacion de `devcontrol.config.json` operativo.
- [x] Creacion de `docs/` base con plantillas.
- [x] Creacion de baseline en `.devcontrol/baseline.json`.
- [x] Archivo de rutas protegidas base.
- [x] Archivo de politicas base con comandos bloqueados.
- [x] Instalacion automatica de Git hooks durante init.

## Epica 2. Gobierno de sesion — COMPLETADA
### Tareas completadas
- [x] `session:start` con objetivo, alcance y presupuesto de tokens.
- [x] `session:check` con estimacion de tokens y refresco de contexto.
- [x] `session:checklist:update` para actualizar items de checklist.
- [x] `session:close` con estado final y refresco de artefactos.
- [x] Persistencia de solicitudes, checklist y estado de sesion.
- [x] Resumen diario y digest de memoria actualizados al cerrar.
- [x] Preflight obligatorio antes de iniciar sesion (bloqueo si docs incompletos).

## Epica 3. Motor de politicas minimo — COMPLETADA
### Tareas completadas
- [x] Evaluador de riesgo por rutas (`policy:path`).
- [x] Evaluador de comandos (`policy:command`).
- [x] Gestion de rutas protegidas (add, remove, list).
- [x] Gestion de comandos aprobados (approve, revoke, list).
- [x] Clasificacion de riesgo LOW/MEDIUM/HIGH.
- [x] Aprobaciones por sesion (grant, revoke, list).

## Epica 4. Memoria local y ahorro de tokens — COMPLETADA
### Tareas completadas
- [x] Detector heuristico de presupuesto de tokens.
- [x] Refresco de digest y memoria indexada al entrar en zona de alerta.
- [x] Proximos pasos y riesgos abiertos en memoria.
- [x] Artefactos de sesion (MD, checklist, context JSON, diff summary, audit JSONL).

## Epica 5. Auditoria portable — COMPLETADA
### Tareas completadas
- [x] Backend JSON portable como adaptador temporal.
- [x] Frontera clara para migracion futura a SQLite.
- [x] Persistencia de sesiones, cambios, aprobaciones, snapshots, checklist.
- [x] Reportes de sesion por cambio y por resumen.

## Epica 6. Quality Gates y Preflight — COMPLETADA (nueva)
### Tareas completadas
- [x] Deteccion automatica de fase del proyecto (uninitialized, initialized, designed, development, testing).
- [x] Validacion de documentos de diseño: detecta plantillas con "pendiente" y exige contenido real.
- [x] Validacion de Git, config, policy, stack, sesiones abiertas.
- [x] `project:check` — comando de auditoria completa del proyecto.
- [x] `session:start` bloqueado si fase < designed (con --skip-preflight para bypass registrado).
- [x] Mensajes de fix accionables para cada check fallido.

## Epica 7. Git Hooks y Enforcement — COMPLETADA (nueva)
### Tareas completadas
- [x] `hooks:install` — instala pre-commit, pre-push y commit-msg.
- [x] `hooks:uninstall` — remueve hooks gestionados.
- [x] `hooks:status` — muestra estado de hooks.
- [x] Pre-commit bloquea commits con cambios HIGH sin aprobar.
- [x] Pre-push bloquea pushes con cambios pendientes o sesiones abiertas.
- [x] Commit-msg valida formato Conventional Commits.
- [x] Hooks marcados como gestionados por SP-DevControl (no sobreescriben hooks del usuario sin --force).
- [x] Instalacion automatica durante `init`.

## Epica 8. Inyeccion de reglas a editores — COMPLETADA (nueva)
### Tareas completadas
- [x] `inject` — genera archivos de reglas para todos los editores soportados.
- [x] Generacion de CLAUDE.md desde controles activos.
- [x] Generacion de .cursorrules desde controles activos.
- [x] Generacion de .windsurfrules.
- [x] Generacion de copilot-instructions.md.
- [x] Generacion de agent-settings.json.
- [x] Inyeccion basada en controles activos del catalogo (36 controles, 14+ active por defecto).

## Epica 9. Compliance y Reportes — COMPLETADA (nueva)
### Tareas completadas
- [x] `report:compliance` — reporte completo con controles, normas, sesiones y violaciones.
- [x] `report:session` — reporte detallado por sesion con metricas, checklist y cambios.
- [x] Mapeo de controles a normas reales (OWASP, RGPD, ISO, SLSA, CWE).
- [x] Conteo de violaciones por control y por sesion.
- [x] Estado de hooks en reporte de compliance.
- [x] Exportacion a markdown con --output.

---

## Comandos CLI disponibles (33 comandos)

### Inicializacion y estado
- `init` — Inicializar proyecto con config, docs, policy, hooks
- `project:status` — Estado basico del proyecto
- `project:check` — Auditoria completa con preflight, fase y blockers

### Politicas
- `policy:path` — Evaluar riesgo de una ruta
- `policy:command` — Evaluar si un comando es permitido/bloqueado
- `policy:protected:list` — Listar rutas protegidas
- `policy:protected:add` — Agregar ruta protegida
- `policy:protected:remove` — Remover ruta protegida
- `policy:command:approved:list` — Listar comandos aprobados
- `policy:command:approve` — Aprobar un comando
- `policy:command:revoke` — Revocar aprobacion de comando

### Sesiones
- `session:start` — Iniciar sesion gobernada (con preflight obligatorio)
- `session:check` — Estimar tokens y refrescar contexto
- `session:checklist:update` — Actualizar item de checklist
- `session:close` — Cerrar sesion
- `session:changes:list` — Listar cambios detectados
- `session:change:show` — Mostrar detalle de un cambio
- `session:change:approve` — Aprobar un cambio
- `session:change:reject` — Rechazar y rollback de un cambio
- `session:approval:list` — Listar aprobaciones activas
- `session:approval:grant` — Otorgar aprobacion
- `session:approval:revoke` — Revocar aprobacion
- `session:snapshots:list` — Listar snapshots de sesion
- `session:rollback` — Rollback por cambio o sesion completa

### Snapshots
- `snapshot:create` — Crear snapshot manual

### Monitoreo
- `watch:start` — Iniciar monitoreo de archivos

### Git Hooks
- `hooks:install` — Instalar hooks de gobernanza
- `hooks:uninstall` — Desinstalar hooks
- `hooks:status` — Estado de hooks

### Inyeccion
- `inject` — Generar reglas para editores agenticos

### Reportes
- `report:compliance` — Reporte de compliance con normas
- `report:session` — Reporte detallado de sesion

---

## Epica 10. Produccion y Cross-Platform — COMPLETADA (nueva)
### Tareas completadas
- [x] `src/platform.ts` — utilidades cross-platform: safeChmod, normalizePath, isWindows, tempDir, onExit.
- [x] `hooks.ts` actualizado con safeChmod (no-op en Windows, chmod en Linux).
- [x] `storage.ts` — escritura atomica (tmp+rename), recuperacion de corrupcion (.tmp/.bak), validacion de schema, backup automatico.
- [x] `cli.ts` — --version, --verbose, error handling mejorado, signal handling Windows (SIGHUP).
- [x] `package.json` — author, license, repository, keywords, files, scripts prepublishOnly/start.
- [x] Documentacion del proyecto completada con contenido real (00-project-brief, 01-requirements, 02-architecture).
- [x] README.md con instalacion, quick start y lista de comandos.
- [x] LICENSE MIT.
- [x] `.devcontrol/config.json` — nombre corregido a SP-DevControl, stack definido.
- [x] Preflight pasa completo: Phase TESTING, Status READY, 18/18 checks.
- [x] El sistema puede gobernarse a si mismo (session:start sin bloqueo).

---

## Proximas epicas post-MVP

### Epica 10. Optimizacion real de tokens
- Integracion con APIs de proveedores para conteo real de tokens.
- Presupuesto por sesion con corte automatico.
- Comparacion de eficiencia entre agentes.
- Recomendaciones de reduccion de contexto.

### Epica 11. Migracion a SQLite
- Migrar backend JSON a SQLite real.
- Mantener compatibilidad de interfaz.
- Agregar indices para queries de compliance.

### Epica 12. Lanzamiento controlado de editores
- Comando `launch` que inicia el editor desde SP-DevControl.
- Inyeccion automatica de contexto y reglas al lanzar.
- Registro de sesion iniciada desde wrapper.

### Epica 13. Daemon local
- Watcher persistente como proceso de background.
- Comunicacion con CLI via IPC o socket.
- Clasificacion de riesgo en tiempo real.

### Epica 14. Desktop app
- Dashboard con estado del proyecto.
- Aprobaciones visuales interactivas.
- Diffs visuales y snapshots.
- Tauri + React.

### Epica 15. Integraciones avanzadas con editores
- Extension VS Code con panel de estado.
- Integracion profunda con Cursor rules format.
- Hook de Claude Code settings.

---

## Definicion de terminado del MVP — CUMPLIDA
- [x] Proyecto inicializable.
- [x] Sesiones gobernadas operativas.
- [x] Presupuesto de tokens con alerta.
- [x] Memoria y resumen diario activos.
- [x] Politicas minimas consultables.
- [x] Persistencia local confiable.
- [x] Quality gates que bloquean desarrollo sin diseño.
- [x] Git hooks que bloquean commits sin aprobacion.
- [x] Inyeccion de reglas a editores.
- [x] Reportes de compliance con normas.
