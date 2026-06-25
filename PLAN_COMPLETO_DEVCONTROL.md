# PLAN COMPLETO SP-DEVCONTROL

## 1. Resumen ejecutivo del sistema
SP-DevControl es una capa local de gobernanza para desarrollo asistido por IA. No sustituye al editor ni al agente; los orquesta y restringe. Su función es validar el proyecto antes del primer prompt, imponer reglas técnicas y operativas, proteger archivos críticos, monitorear cambios, controlar comandos, exigir aprobaciones según riesgo, generar snapshots y registrar auditoría completa por sesión.

La oportunidad de producto existe porque los editores agénticos aceleran la ejecución, pero no resuelven por sí mismos gobierno técnico, trazabilidad, rollback, control de alcance, protección de dependencias ni disciplina de arquitectura. SP-DevControl cubre ese vacío como sistema de precontrol y postcontrol local.

## 2. Problema que resuelve
Los flujos actuales suelen empezar en `prompt -> agente -> cambios`, lo que deja el control demasiado tarde. Eso genera:

- cambios fuera de alcance;
- modificaciones peligrosas en auth, pagos, DB o despliegue;
- sobrescritura o borrado de archivos;
- dependencia de prompts manuales inconsistentes;
- pérdida de contexto técnico entre sesiones;
- aumento innecesario de tokens;
- historial débil de decisiones y aprobaciones;
- falta de rollback confiable y auditoría accionable.

SP-DevControl mueve el punto de control a `proyecto -> políticas -> contexto -> editor -> agente -> revisión -> aprobación`.

## 3. Público objetivo
- Desarrolladores independientes que usan Cursor, Claude Code, Copilot o VS Code con IA y necesitan disciplina operativa.
- Tech leads y arquitectos que quieren limitar riesgo sin frenar demasiado la velocidad.
- Equipos pequeños y medianos que comparten repositorios con agentes, pero aún no tienen una plataforma interna de gobernanza.
- Software factories y consultoras que requieren trazabilidad, rollback y protección contractual de activos críticos.
- Equipos regulados o con sensibilidad alta en seguridad, pagos, datos personales o producción.

## 4. Evaluación del nombre del producto
### DevControl Local
Ventajas:
- describe bien el concepto de control local;
- comunica instalación en la máquina del usuario;
- es funcional para naming técnico.

Debilidades:
- suena más a utilidad interna que a producto comercial;
- el término `Local` limita posicionamiento futuro si luego existe daemon compartido, dashboard remoto o edición de políticas centralizadas;
- tiene menor recordación de marca.

### DevControl IA
Ventajas:
- mantiene continuidad semántica con el concepto original;
- posiciona explícitamente el ámbito de uso;
- sirve mejor para marca paraguas.

Debilidades:
- menos claro sobre la ejecución local;
- puede sonar más genérico en búsquedas.

### AgentGuard Local
Ventajas:
- muy claro en la idea de “vigilar agentes”;
- diferenciación inmediata frente a editores.

Debilidades:
- deja fuera el control de proyecto, Git, contexto y arquitectura;
- menos fuerte para expansión a gobierno integral de desarrollo.

### CodeSafe AI
Ventajas:
- comercialmente simple;
- orientado a seguridad.

Debilidades:
- demasiado cerca de discurso genérico de seguridad;
- subrepresenta control de contexto, costos, UX y flujo operativo.

### DevGuard IA
Ventajas:
- corto, comercial y recordable;
- comunica protección técnica.

Debilidades:
- algo genérico;
- menos orientado a gobierno de proceso que `DevControl`.

### PromptSafe Dev
Ventajas:
- atractivo para el problema de prompts.

Debilidades:
- reduce demasiado el producto al prompt;
- el sistema realmente controla más capas que el prompt.

### SolucionesPro DevControl IA
Ventajas:
- posible utilidad corporativa o white-label.

Debilidades:
- demasiado largo;
- débil para posicionamiento de producto SaaS o instalable.

### SP-DevControl
Ventajas:
- incorpora la marca madre sin volver el nombre demasiado largo;
- funciona bien en instalador, CLI, documentación y repositorio;
- conserva el núcleo semántico `DevControl`, que sigue describiendo el sistema;
- es viable para comercialización B2B y versión empresarial.

Debilidades:
- requiere construir reconocimiento inicial de la sigla `SP`;
- comunica menos explícitamente el componente `IA` que `DevControl IA`.

## 5. Nombre recomendado y justificación
### Recomendación
**Marca oficial del producto:** `SP-DevControl`  
**Nombre de la aplicación local:** `SP-DevControl Local`  
**Nombre corto operativo:** `DevControl`

### Justificación técnica, comercial y de posicionamiento
- `SP-DevControl` integra la marca corporativa y mantiene un nombre corto, serio y utilizable en todos los artefactos técnicos.
- `SP-DevControl Local` funciona bien como denominación del runtime instalable.
- `DevControl` puede mantenerse como nombre corto de comandos, módulos o referencias internas sin romper consistencia de marca.
- La palabra `Control` representa mejor el alcance real que `Guard` o `Safe`, porque el sistema no solo vigila: valida, configura, restringe, documenta, registra y revierte.
- Mantener el núcleo `DevControl` evita dispersión conceptual y facilita una línea futura como `SP-DevControl CLI`, `SP-DevControl Desktop`, `SP-DevControl Enterprise`.

## 6. Propuesta de valor
SP-DevControl permite usar editores agénticos con velocidad, pero bajo un marco técnico verificable. Convierte un flujo informal basado en prompts en un flujo controlado por políticas, contexto y aprobaciones.

Valor concreto:
- reduce errores estructurales antes del primer cambio;
- evita tocar zonas críticas sin autorización;
- conserva memoria técnica del proyecto;
- baja costo operativo y de tokens;
- mejora trazabilidad y capacidad de rollback;
- estandariza sesiones con agentes entre herramientas distintas.

## 7. Diferenciador frente a editores agénticos
Los editores agénticos son motores de ejecución asistida; SP-DevControl es una capa de gobernanza local. El diferenciador principal no es “mejor IA”, sino “mejor control del uso de la IA”.

Diferenciadores:
- arranque obligatorio antes del primer prompt;
- políticas por proyecto y por sesión;
- archivos protegidos y comandos bloqueados;
- snapshots con rollback controlado;
- auditoría técnica persistente;
- control de alcance, costo y contexto;
- integración transversal con varios editores.

## 8. Alcance funcional
- Inicialización guiada de proyectos controlados.
- Validación de Git y stack autorizado.
- Generación de documentos base en `/docs`.
- Generación de reglas e instrucciones para Cursor, Claude Code, Copilot y VS Code.
- Definición y mantenimiento de archivos/rutas protegidas.
- Instalación de Git hooks.
- Snapshot inicial y snapshots por sesión/cambio.
- Lanzamiento controlado del editor desde CLI o desktop app.
- Monitoreo local de cambios en tiempo real.
- Clasificación de riesgo de archivos, diffs y comandos.
- Flujo de aprobación para cambios críticos.
- Registro de eventos, sesiones, aprobaciones, rollbacks y auditoría.
- Gestión de contexto técnico y objetivo de sesión.
- Reportes locales y exportables.

## 9. Alcance no funcional
- Ejecución offline-first.
- Bajo consumo de recursos.
- Arranque rápido.
- Base de datos local confiable.
- Compatibilidad mínima con Windows, macOS y Linux.
- UX clara para revisión de riesgo y aprobación.
- Integridad de auditoría local.
- Diseño extensible por adaptadores de editor.
- Seguridad por defecto en secretos y archivos sensibles.

## 10. Riesgos que debe controlar
- borrado o sobrescritura no autorizada;
- cambios de stack o dependencias;
- modificaciones en auth, pagos, DB, infraestructura o producción;
- pérdida de contexto técnico entre sesiones;
- cambios fuera del alcance acordado;
- comandos destructivos;
- costos de tokens excesivos;
- prompts ambiguos o sesiones sin objetivo;
- rotura de build, hooks o ramas;
- ausencia de historial verificable para auditoría o soporte.

## 11. Reglas obligatorias del sistema
- No eliminar archivos sin aprobación explícita.
- No modificar dependencias sin aprobación.
- No cambiar el stack definido.
- No modificar autenticación sin aprobación.
- No modificar base de datos sin aprobación.
- No modificar pagos sin aprobación.
- No modificar archivos `.env`.
- No tocar producción.
- No ejecutar comandos destructivos.
- No reescribir archivos completos si un cambio parcial es suficiente.
- Antes de modificar más de 3 archivos, presentar plan.
- Después de cada cambio, entregar resumen técnico.
- Todo cambio debe asociarse a una sesión.
- Todo cambio crítico debe requerir aprobación.
- Todo rollback debe quedar registrado.

## 11.1. Auto control de SP-DevControl desde el dia 1
El propio desarrollo de SP-DevControl debe operar bajo el mismo modelo de gobernanza que vendera a terceros. No puede nacer como excepcion, porque eso invalidaria su propuesta de valor y retrasaria la validacion real del producto.

Principio rector:
- toda tarea de SP-DevControl debe ejecutarse como una sesion gobernada, con objetivo, alcance, diff revisable, snapshot y registro en auditoria.

Reglas de aplicacion interna desde el primer dia:
- crear el repositorio oficial bajo la marca SP-DevControl;
- inicializar Git antes del primer cambio funcional;
- generar devcontrol.config.json, .devcontrol/ y /docs en la raiz del producto desde la fase 0;
- registrar cada cambio bajo una sesion tecnica con objetivo explicito;
- exigir plan previo si una tarea toca mas de 3 archivos o mas de un modulo;
- bloquear eliminacion de archivos y cambios destructivos salvo aprobacion explicita registrada;
- proteger desde el inicio configuracion, branding, rutas de seguridad, politicas, migraciones y contratos de datos;
- exigir diff y resumen tecnico despues de cada cambio aprobado;
- exigir hooks activos en local antes de aceptar trabajo recurrente;
- mantener snapshots por fase y antes de cualquier refactor estructural;
- no permitir divergencia entre documentacion de producto y comportamiento implementado sin registrar riesgo abierto.

Artefactos que deben existir desde fase 0:
- devcontrol.config.json;
- .devcontrol/;
- docs/00-project-brief.md;
- docs/01-requirements.md;
- docs/02-architecture.md;
- docs/06-security-rules.md;
- docs/07-agent-rules.md;
- docs/08-change-log.md;
- docs/09-risk-register.md.

Rutas protegidas internas de SP-DevControl desde el dia 1:
- Cargo.toml o manifiestos equivalentes de cada paquete;
- package.json, lockfiles y configuracion del workspace;
- src-tauri/**, core/**, policy-engine/**, storage/**, audit-logger/**;
- docs/02-architecture.md, docs/06-security-rules.md, docs/07-agent-rules.md;
- .github/workflows/**;
- migraciones o esquemas SQLite;
- plantillas de reglas para editores;
- branding oficial y nombre del producto.

Comandos restringidos para el desarrollo del propio producto:
- bloqueados por defecto: rm -rf, git reset --hard, git clean -fd, git push --force, borrado de snapshots, eliminacion de auditoria;
- permitidos: cargo test, cargo check, npm run test, npm run build, validadores de lint y typecheck;
- con aprobacion: cambios de dependencias, cambios de estructura del monorepo, regeneracion de base de datos, renombre masivo, cambios de branding.

Gates obligatorios por fase:
- Fase 0: naming oficial, estructura documental y reglas base activas;
- Fase 1: CLI con hooks, auditoria SQLite y snapshot inicial funcionando;
- Fase 2: daemon con monitoreo y clasificacion de riesgo verificable;
- Fase 3: desktop app consumiendo el mismo modelo de sesiones y aprobaciones;
- Fase 4 en adelante: ninguna integracion externa puede publicarse si no respeta las mismas politicas internas.

Definicion de terminado para cualquier cambio interno:
- objetivo de sesion definido;
- alcance declarado;
- diff revisado;
- riesgo clasificado;
- decision registrada;
- documentacion actualizada si cambio comportamiento;
- snapshot o commit de restauracion disponible.

Beneficio estrategico:
- SP-DevControl se valida sobre si mismo desde el inicio;
- las reglas dejan de ser teoricas y se convierten en criterio operativo real;
- el producto puede demostrar trazabilidad nativa desde sus primeras versiones.

## 12. Supuestos y contradicciones encontradas
### Supuestos explícitos
- Solo se encontró un documento base de diseño y un prototipo CLI en TypeScript.
- No se encontraron documentos previos adicionales de negocio, UX o arquitectura aparte del texto principal.
- Se asume que el objetivo actual es redefinir el producto y no continuar ciegamente el prototipo existente.
- Se asume como decisión vigente que toda evolución futura debe construirse o migrarse bajo la marca `SP-DevControl`.

### Contradicciones o debilidades detectadas
- El diseño textual usa `DevControl`, pero el código actual usa `DevSentinel`.
- El diseño pide `.devcontrol`, pero la implementación actual genera `.devsentinel`.
- El diseño sugiere `.cursor/rules`, pero el prototipo actual escribe `.cursorrules`; eso no coincide con los patrones modernos de Cursor.
- El diseño aspira a “bloquear” borrados vía file watcher, pero un watcher detecta después del evento. Para bloqueo real se requiere wrapper/sandbox, hooks, permisos o flujo de aprobación previo.
- El diseño habla de control antes del primer prompt, pero esto solo es parcialmente exigible si el editor se lanza desde DevControl o si existe integración específica.
- La implementación actual ya decidió un stack Node/TypeScript con `chokidar`, `simple-git` y `better-sqlite3`, mientras el objetivo solicitado evalúa Tauri/Rust como opción principal.

Estas contradicciones no invalidan la idea; indican que se necesita una arquitectura producto clara antes de seguir programando y una migración formal de naming hacia `SP-DevControl`.

## 13. Arquitectura general
Arquitectura recomendada en 4 bloques:

1. `CLI de control`
Responsable de `init`, `launch`, `check`, `snapshot`, `rollback`, `audit`.

2. `Daemon local`
Responsable de observación continua, evaluación de riesgo, eventos, aprobaciones y coordinación con la app desktop.

3. `Desktop app`
Responsable de onboarding, configuración, revisión de diffs, auditoría, costos, contexto y snapshots.

4. `Adaptadores de integración`
Responsables de conectar reglas, hooks e instrucciones a cada editor o herramienta.

## 14. Arquitectura por capas
### Capa 1. Presentación
- Desktop app Tauri + React.
- CLI en Rust.
- Extensión VS Code en TypeScript.

### Capa 2. Aplicación
- coordinador de sesiones;
- orquestador de aprobaciones;
- generador de contexto;
- gestor de snapshots;
- pipeline de inicialización.

### Capa 3. Dominio
- motor de políticas;
- clasificador de riesgo;
- modelo de comandos;
- modelo de archivos protegidos;
- modelo de integraciones.

### Capa 4. Infraestructura
- SQLite;
- watcher de archivos;
- integración Git;
- ejecución de procesos;
- hooks;
- almacenamiento local de documentos y auditoría.

## 15. Componentes principales
- `project-initializer`
- `policy-engine`
- `editor-launcher`
- `file-monitor`
- `command-guard`
- `git-controller`
- `snapshot-manager`
- `approval-engine`
- `audit-logger`
- `context-builder`
- `cost-controller`
- `ui-ux-guard`
- `integration-adapters`

## 16. Módulos internos
- detección de stack;
- plantillas de documentación base;
- catálogo de reglas por editor;
- escáner de archivos sensibles;
- parser de diffs;
- normalizador de eventos;
- motor de niveles de riesgo;
- gestor de planes de sesión;
- repositorio SQLite;
- exportador de reportes.

## 17. Flujo antes del primer prompt
1. El usuario abre SP-DevControl Local.
2. Selecciona un proyecto existente o crea uno nuevo.
3. El sistema valida si existe `.git`.
4. Si no existe, solicita inicializar Git y configurar rama principal.
5. El sistema detecta el stack probable y pide confirmar el stack autorizado.
6. El sistema crea `devcontrol.config.json`.
7. El sistema crea `.devcontrol/`.
8. El sistema genera `/docs` base.
9. El sistema define archivos y rutas protegidas.
10. El sistema instala hooks.
11. El sistema crea snapshot inicial.
12. El sistema inicia daemon/monitoreo local.
13. El usuario define objetivo de la sesión IA.
14. El usuario define alcance permitido.
15. El sistema genera prompt inicial controlado e instrucciones de entorno.
16. El sistema lanza el editor agéntico.
17. Recién entonces la sesión IA queda habilitada.

## 18. Flujo de uso diario
1. Abrir SP-DevControl.
2. Seleccionar proyecto.
3. Ver estado: Git, snapshot, reglas, riesgos abiertos, costos previos.
4. Definir objetivo y alcance de la sesión.
5. Lanzar editor.
6. Monitorear cambios.
7. Clasificar diffs por riesgo.
8. Pedir aprobación cuando aplique.
9. Registrar resultados y resumen técnico.
10. Crear snapshot de cierre o rollback si procede.

## 19. Integración con editores agénticos
La estrategia correcta es híbrida:

- `pre-control`: validación, reglas, contexto, snapshot, lanzamiento;
- `in-editor`: instrucciones, settings, extensiones, hooks compatibles;
- `runtime-control`: watcher, guard de comandos, diffs y aprobaciones;
- `post-control`: auditoría, reportes, rollback.

No todos los editores permiten interceptar el prompt. Por eso el diseño debe asumir control fuerte del entorno y control variable del prompt.

## 20. Integración con Cursor
- Generar reglas en formato compatible con la versión vigente del producto.
- Lanzar Cursor desde `devcontrol launch cursor`.
- Sincronizar scope permitido y rutas protegidas.
- Inyectar instrucciones de plan previo si el cambio supera umbrales.
- Registrar sesión iniciada desde wrapper.

Riesgo:
- compatibilidad cambiante del formato de reglas según versiones de Cursor.

## 21. Integración con Claude Code
- Generar `CLAUDE.md`.
- Generar settings compatibles si el entorno soporta permisos y hooks.
- Lanzar `claude` o `claude-code` desde SP-DevControl con objetivo controlado.
- Registrar uso de herramientas, cambios y rollbacks asociados a sesión.

Riesgo:
- parte del control dependerá del mecanismo de permisos/herramientas disponible en la versión instalada.

## 22. Integración con GitHub Copilot
- Generar `.github/copilot-instructions.md`.
- Generar reglas de proyecto y recomendaciones de scope.
- Complementar con hooks y watchers, ya que Copilot por sí mismo no ofrece el mismo nivel de instrumentación que una CLI agéntica.

## 23. Integración con VS Code
- Extensión ligera para mostrar estado de sesión, riesgos, diffs y aprobaciones.
- Comando “Abrir con SP-DevControl”.
- Panel lateral de contexto activo y riesgos.
- Canal IPC con daemon local.

## 24. Sistema de reglas para agentes
El sistema debe soportar:
- reglas globales por producto;
- reglas por proyecto;
- reglas por sesión;
- reglas por editor;
- reglas por nivel comercial.

Las reglas deben ser declarativas, versionables y evaluables por el motor de políticas.

Formato recomendado:
- archivo JSON/YAML interno normalizado;
- salida adaptada por editor al formato que cada uno soporte.

## 25. Sistema de archivos protegidos
Base protegida:
- `.env`
- `.env.local`
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`
- `Dockerfile`
- `docker-compose.yml`
- `.github/workflows/**`
- `src/auth/**`
- `src/payments/**`
- `src/database/**`
- `src/config/**`
- `prisma/schema.prisma`
- `firebase.json`
- `firestore.rules`
- `supabase/**`

Reglas:
- lectura permitida según política;
- modificación crítica requiere aprobación;
- eliminación bloqueada por defecto;
- cambios deben mostrar diff y motivo.

## 26. Sistema de monitoreo de cambios
Fuentes:
- watcher de archivos;
- Git status/diff;
- eventos del launcher;
- eventos de aprobación;
- hooks.

Eventos mínimos:
- create;
- modify;
- delete attempt;
- rename;
- dependency change;
- protected path touch;
- critical command attempt.

Nota técnica:
un watcher no impide el cambio por sí solo; solo detecta. El bloqueo real debe apoyarse en wrappers, aprobaciones y restauración automática.

## 27. Sistema de control de comandos
Estrategia:
- catálogo base de comandos permitidos, restringidos y bloqueados;
- wrapper para lanzar terminal/editor dentro de sesión controlada;
- revisión de patrones peligrosos;
- aprobación previa para ciertos comandos;
- registro exhaustivo.

### Comandos bloqueados base
- `rm -rf`
- `del /s`
- `git reset --hard`
- `git clean -fd`
- `git push --force`
- `docker compose down -v`
- `npm uninstall`
- `pnpm remove`
- `yarn remove`
- `drop database`
- `truncate table`
- `firebase deploy`
- comandos que modifiquen producción sin aprobación

### Comandos permitidos base
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `flutter analyze`
- `flutter test`

## 28. Sistema de snapshots y rollback
Tipos:
- snapshot inicial del proyecto controlado;
- snapshot por apertura de sesión;
- snapshot preaprobación de cambio crítico;
- snapshot manual.

Rollback:
- por archivo;
- por changeset;
- por sesión;
- por snapshot etiquetado.

Tecnología:
- en MVP puede apoyarse en Git + metadatos SQLite;
- en fases posteriores puede incorporar copia incremental y diff binary-aware.

## 29. Sistema de auditoría
Debe registrar:
- proyecto;
- sesión;
- usuario local;
- editor;
- agente;
- objetivo;
- alcance;
- archivos tocados;
- diffs resumidos;
- comandos;
- aprobaciones/rechazos;
- rollbacks;
- timestamps;
- nivel de riesgo.

Salida:
- SQLite como fuente primaria;
- exportación JSONL/Markdown para soporte y compliance liviano.

## 30. Sistema de control de contexto
Objetivo:
evitar pérdida de memoria técnica y prompts redundantes.

Debe mantener:
- brief del proyecto;
- requisitos activos;
- arquitectura autorizada;
- stack confirmado;
- riesgos abiertos;
- decisiones previas;
- objetivo de sesión;
- restricciones vigentes.

Operación:
- compilar contexto desde `/docs`, config y sesiones;
- resumirlo en bloques reutilizables;
- enviar al editor/agente solo contexto mínimo relevante.

## 31. Sistema de control de costos
En MVP:
- seguimiento de sesiones, cambios, archivos y tamaño estimado de contexto.
- cálculo heurístico de consumo.

En fases posteriores:
- integración con proveedores/modelos para tokens reales;
- presupuestos por sesión/proyecto;
- alertas por umbral;
- análisis de costo por editor y por tipo de tarea.

## 32. Sistema de control UI/UX
No debe diseñar interfaces de negocio automáticamente, pero sí vigilar calidad mínima cuando la tarea impacta frontend.

Controles:
- verificación de design tokens;
- chequeo de accesibilidad básica;
- revisión de consistencia con sistema visual documentado;
- alerta de cambios genéricos o fuera del patrón aprobado.

En MVP debe ser una heurística y checklist, no un verificador “inteligente” demasiado ambicioso.

## 33. Sistema de Git hooks
Hooks recomendados:
- `pre-commit`: lint, typecheck, validaciones rápidas;
- `commit-msg`: convención de mensajes con referencia a sesión;
- `pre-push`: evitar pushes riesgosos sin aprobación/cierre correcto;
- `post-merge`: verificar integridad de metadatos SP-DevControl.

## 34. Modelo de configuración del proyecto
Archivo recomendado: `devcontrol.config.json`

Campos mínimos:
- `projectId`
- `projectName`
- `stackAuthorized`
- `editorsAllowed`
- `defaultEditor`
- `riskPolicy`
- `protectedPaths`
- `commandPolicy`
- `gitPolicy`
- `docsPolicy`
- `contextPolicy`
- `costPolicy`
- `uiUxPolicy`
- `sessionDefaults`

## 35. Estructura de carpetas del sistema
```text
sp-devcontrol/
├── core/
├── desktop/
├── cli/
├── integrations/
├── storage/
├── policy-engine/
├── file-monitor/
├── git-controller/
├── command-guard/
├── snapshot-manager/
├── audit-logger/
├── context-builder/
├── ui/
└── docs/
```

## 36. Estructura de carpetas generada en proyectos controlados
```text
project-root/
├── devcontrol.config.json
├── docs/
│   ├── 00-project-brief.md
│   ├── 01-requirements.md
│   ├── 02-architecture.md
│   ├── 03-data-model.md
│   ├── 04-ui-system.md
│   ├── 05-api-contracts.md
│   ├── 06-security-rules.md
│   ├── 07-agent-rules.md
│   ├── 08-change-log.md
│   └── 09-risk-register.md
├── .devcontrol/
│   ├── audit/
│   ├── snapshots/
│   ├── sessions/
│   ├── cache/
│   └── runtime/
├── .cursor/rules/
├── .github/
│   ├── copilot-instructions.md
│   └── CODEOWNERS
├── .claude/
│   └── settings.json
├── CLAUDE.md
└── .git/hooks/
```

## 37. Modelo de datos local
Base local SQLite con tablas mínimas:

### projects
- `id`
- `name`
- `root_path`
- `created_at`
- `updated_at`
- `stack_authorized_json`
- `default_editor`
- `risk_level_default`
- `status`

### sessions
- `id`
- `project_id`
- `editor`
- `agent`
- `objective`
- `allowed_scope_json`
- `started_at`
- `ended_at`
- `status`
- `estimated_token_cost`

### file_events
- `id`
- `session_id`
- `project_id`
- `path`
- `event_type`
- `is_protected`
- `risk_level`
- `diff_ref`
- `created_at`

### approvals
- `id`
- `session_id`
- `event_id`
- `approval_type`
- `requested_at`
- `decided_at`
- `decision`
- `reason`
- `decided_by`

### snapshots
- `id`
- `project_id`
- `session_id`
- `snapshot_type`
- `git_ref`
- `storage_path`
- `created_at`
- `created_by`

### protected_paths
- `id`
- `project_id`
- `pattern`
- `category`
- `requires_approval`
- `created_at`

### commands
- `id`
- `session_id`
- `command_text`
- `normalized_command`
- `risk_level`
- `decision`
- `executed_at`
- `exit_code`

### audit_logs
- `id`
- `project_id`
- `session_id`
- `entity_type`
- `entity_id`
- `action`
- `details_json`
- `created_at`

### agent_rules
- `id`
- `project_id`
- `target_editor`
- `rule_type`
- `source_policy`
- `content`
- `version`
- `generated_at`

### editor_integrations
- `id`
- `project_id`
- `editor_name`
- `launch_command`
- `settings_path`
- `rules_path`
- `is_enabled`
- `updated_at`

### context_documents
- `id`
- `project_id`
- `doc_type`
- `path`
- `checksum`
- `summary`
- `updated_at`

### risk_events
- `id`
- `project_id`
- `session_id`
- `risk_type`
- `severity`
- `source`
- `path_or_command`
- `description`
- `status`
- `created_at`

## 38. Stack técnico recomendado
### Opción principal recomendada
- `Tauri`
- `React`
- `TypeScript`
- `Rust`
- `SQLite`
- `notify-rs`
- `libgit2`
- `CLI en Rust`
- `Extensión VS Code en TypeScript`

## 39. Justificación del stack técnico
Esta opción es la mejor para producto local serio y comercializable porque:

- Tauri reduce consumo de RAM y tamaño del instalador frente a Electron.
- Rust da mejor control sobre daemon, watchers, procesos, seguridad y distribución multiplataforma.
- `notify-rs` y `libgit2` son adecuados para observación y operaciones Git locales con menos dependencia del shell.
- SQLite encaja muy bien con auditoría local, sesiones y snapshots.
- React + TypeScript resuelve rápido la capa de desktop UI.
- La extensión de VS Code en TypeScript mantiene compatibilidad con el ecosistema natural del editor.

Desventajas:
- curva de desarrollo mayor;
- velocidad inicial de prototipado inferior a Node/Electron;
- equipo debe manejar Rust con criterio de producto, no solo de backend.

## 40. Alternativas tecnológicas
### Alternativa rápida
- `Electron`
- `React`
- `Node.js`
- `SQLite`
- `Chokidar`
- `simple-git`

### Ventajas
- menor tiempo de prototipo;
- más fácil contratar o iterar si el equipo domina JS/TS;
- ecosistema amplio para desktop y CLI.

### Desventajas
- más consumo de memoria;
- mayor superficie de errores por wrappers shell;
- watcher y Git dependen más de comportamiento externo;
- menos solidez percibida para una herramienta de “control”.

### Recomendación final
- Si el objetivo es validar mercado en 6-10 semanas: comenzar con CLI/daemon MVP en Node/TypeScript puede ser aceptable.
- Si el objetivo es construir el producto base definitivo: migrar la arquitectura objetivo a Rust/Tauri desde temprano.
- Recomendación concreta: **CLI MVP en Node/TypeScript solo como spike o prototipo desechable; producto oficial de SP-DevControl en Tauri/Rust.**

## 40.1. Convención oficial de marca y naming técnico
- Marca comercial: SP-DevControl
- App de escritorio: SP-DevControl Local
- Nombre corto en documentación técnica: DevControl
- Ejecutable CLI recomendado: sp-devcontrol
- Carpeta oculta del proyecto: .devcontrol
- Archivo principal de configuración: devcontrol.config.json
- Carpeta raíz del monorepo o producto: sp-devcontrol/
- Prefijo de base de datos, logs e instaladores: sp-devcontrol

Esta convención preserva una UX técnica limpia. La marca visible usa SP-DevControl, mientras los artefactos dentro del proyecto controlado conservan devcontrol por brevedad y legibilidad.

## 41. MVP recomendado
MVP realista:
- CLI básica;
- inicialización de proyecto;
- validación de Git;
- creación de `devcontrol.config.json`;
- generación de `/docs` base;
- creación de reglas para Cursor, Claude Code y Copilot;
- definición de archivos protegidos;
- instalación de Git hooks;
- snapshot inicial;
- lanzamiento del editor;
- monitoreo de cambios;
- clasificación de riesgo;
- alerta de cambios peligrosos;
- diff;
- rollback básico;
- auditoría básica en SQLite.

Fuera del MVP:
- control fino de costos por proveedor;
- dashboard empresarial remoto;
- políticas multiusuario sincronizadas;
- análisis UX semántico avanzado;
- integración profunda con GitHub/GitLab cloud.

## 42. Roadmap por fases
### Fase 1: CLI
- `init`, `check`, `launch`, `snapshot`, `rollback`, `audit`
- generación de reglas
- archivos protegidos
- hooks

### Fase 2: Daemon local
- watcher persistente
- registro de eventos
- clasificación de riesgo
- aprobaciones por consola

### Fase 3: Desktop app
- dashboard
- diffs visuales
- auditoría
- snapshots

### Fase 4: Integraciones con editores
- Cursor
- Claude Code
- Copilot
- VS Code

### Fase 5: Control visual y costos
- panel de contexto
- métricas de uso
- heurísticas de costo
- chequeos UI/UX

### Fase 6: Versión comercial
- instaladores
- licenciamiento
- plantillas de políticas
- onboarding mejorado

### Fase 7: Versión empresarial
- políticas centralizadas
- sincronización opcional
- roles
- reporting avanzado
- auditoría reforzada

## 43. Criterios de aceptación del MVP
- El proyecto no puede iniciar sesión IA sin validación previa o bypass explícito registrado.
- Si no hay Git, el sistema debe exigir inicialización o registrar rechazo.
- Debe generarse configuración base y documentos esenciales.
- Deben instalarse hooks funcionales.
- Debe existir snapshot inicial recuperable.
- El sistema debe detectar cambios en archivos protegidos.
- Debe clasificar al menos riesgo bajo, medio y alto.
- Debe mostrar diff antes de aprobar cambios críticos.
- Debe registrar sesión, cambios y decisión en SQLite.
- Debe permitir rollback básico por snapshot o Git.

## 44. Casos de uso principales
- Inicializar un proyecto nuevo antes de usar IA.
- Adoptar un proyecto existente y ponerlo bajo control.
- Lanzar Cursor o Claude Code desde una sesión gobernada.
- Detectar intento de cambio en `package.json`.
- Bloquear o exigir aprobación para tocar `src/auth/**`.
- Revisar diffs de una sesión.
- Revertir una sesión problemática.
- Auditar quién aprobó qué y cuándo.

## 45. Historias de usuario
- Como desarrollador individual, quiero iniciar mi proyecto con reglas base para evitar cambios destructivos del agente.
- Como tech lead, quiero proteger auth, pagos y DB para que cualquier cambio ahí requiera aprobación.
- Como consultor, quiero tener evidencia de cambios por sesión para explicar decisiones y hacer rollback rápido.
- Como usuario de Cursor o Claude Code, quiero abrir el editor desde un flujo controlado para no depender de prompts manuales repetitivos.
- Como equipo pequeño, quiero estandarizar stack, documentación y contexto antes del primer prompt.

## 46. Reglas de riesgo por nivel
### Verde
- docs
- textos
- estilos menores
- tests no críticos

### Amarillo
- nuevos componentes
- refactors localizados
- endpoints no sensibles

### Naranja
- dependencias
- configuración
- estructura de carpetas
- modelos de datos

### Rojo
- auth
- pagos
- base de datos
- workflows
- producción
- secretos

### Negro
- destrucción de datos
- force push
- comandos irreversibles
- despliegue a producción no aprobado

## 47. Matriz de permisos
| Acción | Básico | Profesional | Empresa |
|---|---|---|---|
| Inicializar proyecto | Sí | Sí | Sí |
| Reglas por editor | Sí | Sí | Sí |
| Archivos protegidos base | Sí | Sí | Sí |
| Editar políticas avanzadas | Limitado | Sí | Sí |
| Aprobaciones multinivel | No | Parcial | Sí |
| Auditoría avanzada | No | Sí | Sí |
| Dashboard desktop | No | Sí | Sí |
| Costos por sesión | Básico | Sí | Sí |
| Plantillas de compliance | No | No | Sí |

## 48. Matriz de comandos permitidos y bloqueados
| Comando o categoría | Estado | Motivo |
|---|---|---|
| `npm run lint` | Permitido | Validación segura |
| `npm run test` | Permitido | Validación segura |
| `npm run build` | Permitido | Verificación técnica |
| `pnpm test` | Permitido | Verificación técnica |
| `rm -rf` | Bloqueado | Destructivo |
| `git reset --hard` | Bloqueado | Destructivo |
| `git clean -fd` | Bloqueado | Pérdida irreversible |
| `git push --force` | Bloqueado | Riesgo colaborativo |
| `npm uninstall` | Requiere aprobación | Cambia dependencias |
| `docker compose down -v` | Requiere aprobación alta | Riesgo de datos |
| `firebase deploy` | Bloqueado por defecto | Afecta producción |

## 49. Matriz de archivos protegidos
| Ruta/patrón | Nivel | Acción por defecto |
|---|---|---|
| `.env` | Rojo | Bloqueado |
| `.env.local` | Rojo | Bloqueado |
| `package.json` | Naranja | Requiere aprobación |
| `package-lock.json` | Naranja | Requiere aprobación |
| `.github/workflows/**` | Rojo | Requiere aprobación alta |
| `src/auth/**` | Rojo | Requiere aprobación alta |
| `src/payments/**` | Rojo | Requiere aprobación alta |
| `src/database/**` | Rojo | Requiere aprobación alta |
| `src/config/**` | Naranja | Requiere aprobación |
| `prisma/schema.prisma` | Rojo | Requiere aprobación alta |

## 50. Pantallas principales de la aplicación
- Dashboard del proyecto
- Configuración inicial
- Selección de stack
- Reglas del agente
- Archivos protegidos
- Monitor de cambios
- Revisión de diff
- Aprobaciones
- Auditoría
- Snapshots y rollback
- Configuración de editores
- Contexto activo del proyecto
- Control de costos
- Control UI/UX

## 51. Métricas del sistema
- proyectos inicializados;
- sesiones por editor;
- cambios aprobados/rechazados;
- intentos sobre archivos protegidos;
- rollbacks por sesión;
- comandos bloqueados;
- cambios fuera de alcance;
- dependencias modificadas;
- costo estimado por sesión;
- tiempo medio de aprobación;
- incidencias críticas evitadas.

## 52. Estrategia comercial inicial
- Entrar por dolor técnico real: “usa IA sin perder control del proyecto”.
- Posicionarlo para devs avanzados y consultoras antes que para mercado masivo.
- Ofrecer CLI gratuita o trial y versión Pro con desktop app y auditoría ampliada.
- Publicar contenido comparando “editor agéntico solo” vs “editor con capa de gobernanza”.
- Enfocar mensaje en protección de código, trazabilidad y ahorro de retrabajo.

## 53. Paquetes o planes del producto
### Básico
- CLI
- init
- reglas base
- hooks
- snapshot inicial
- monitoreo básico

Público:
indie developers.

### Profesional
- todo lo anterior
- desktop app
- aprobaciones visuales
- auditoría SQLite + reportes
- rollback mejorado
- control de costos

Público:
freelancers senior, small teams, consultoras pequeñas.

### Empresa
- todo lo anterior
- políticas avanzadas
- plantillas por organización
- evidencias exportables
- integraciones empresariales
- controles reforzados y soporte

Público:
software factories, fintechs, equipos regulados.

## 54. Riesgos técnicos del desarrollo
- diferencias de integración entre editores;
- cambios frecuentes en formatos de reglas de herramientas externas;
- complejidad multiplataforma de watchers, permisos y procesos;
- falsa sensación de “bloqueo” si solo existe monitoreo posterior;
- deuda técnica si se comienza en Node y se intenta evolucionar a Rust sin frontera clara;
- dificultad de modelar comandos ejecutados fuera del wrapper.

## 55. Riesgos comerciales
- algunos usuarios verán fricción donde hoy solo buscan velocidad;
- el mercado todavía está aprendiendo que necesita gobernanza local de IA;
- si el producto promete “control total del prompt”, generará expectativas irreales;
- la propuesta debe demostrar ahorro de errores, no solo más pasos de proceso.

## 56. Recomendaciones finales
- Definir formalmente `SP-DevControl` como marca, `SP-DevControl Local` como app local y `sp-devcontrol` como binario recomendado.
- Tomar la arquitectura Tauri/Rust como target oficial.
- Tratar el prototipo Node/TypeScript actual como referencia funcional, no como base inevitable.
- Enfatizar el MVP en control previo, reglas, snapshots, diffs y auditoría; no intentar resolver todo el ecosistema de IA de una vez.
- Diseñar el producto alrededor del concepto de “sesión gobernada”.
- No prometer interceptación universal del prompt; prometer control verificable del entorno, de los cambios y del riesgo.
- Separar desde el inicio políticas, adaptadores e interfaz para evitar acoplamiento fuerte a un editor específico.
- Migrar o crear todos los artefactos nuevos bajo la nueva marca.
- Renombrar progresivamente referencias públicas `DevSentinel` a `SP-DevControl`.
- Mantener `.devcontrol` y `devcontrol.config.json` como naming técnico estable dentro de proyectos controlados.
- Reservar `DevSentinel` solo como antecedente histórico del prototipo, no como nombre de producto.
- Evitar coexistencia indefinida de dos marcas en documentación, UI, repositorio y CLI.



## 57. Skills, MCPs y herramientas recomendadas para desarrollar SP-DevControl
El propio desarrollo de SP-DevControl debe apoyarse en capacidades auxiliares que aceleren implementacion, reduzcan errores y eviten repetir analisis extensos en cada sesion.

Objetivos:
- reducir tokens consumidos en descubrimiento repetitivo;
- preservar contexto tecnico util entre sesiones;
- estandarizar ejecucion de tareas del producto;
- habilitar implementacion mas segura de integraciones con editores y politicas.

Skills recomendadas:
- skill de inicializacion de proyecto;
- skill de politicas y matrices de riesgo;
- skill de integraciones de editores;
- skill de auditoria y reportes;
- skill de memoria local y contexto;
- skill de snapshots y rollback;
- skill de costos y compactacion de contexto;
- skill de release readiness.

MCPs o conectores recomendados:
- filesystem MCP;
- git MCP;
- sqlite MCP;
- docs/index MCP local;
- process o command MCP controlado;
- github MCP opcional;
- editor bridge MCP futuro.

Herramientas auxiliares recomendadas:
- indice local de documentos y decisiones;
- buscador semantico local sobre docs y logs;
- generador de resumen de sesion;
- comparador de arquitectura esperada vs implementada;
- verificador de consistencia de marca y naming tecnico;
- checklist runner para aperturas y cierres de sesion.

Regla de adopcion:
- toda capability adicional debe evaluarse por costo, estabilidad, privacidad local y facilidad de auditoria antes de integrarse al core.

## 58. Sistema de memoria y contexto local para ahorro de tokens
SP-DevControl debe incluir memoria local estructurada para no reanalizar el proyecto completo en cada sesion. La memoria no reemplaza la documentacion; la resume, la indexa y la vuelve util para sesiones futuras.

Objetivos:
- reducir relectura completa del proyecto;
- evitar prompts repetidos;
- conservar decisiones tecnicas y comerciales;
- reinyectar solo contexto minimo relevante por sesion.

Artefactos recomendados de memoria local:
- .devcontrol/memory/project_summary.md
- .devcontrol/memory/architecture_summary.md
- .devcontrol/memory/open_risks.md
- .devcontrol/memory/active_constraints.md
- .devcontrol/memory/integration_status.md
- .devcontrol/memory/brand_and_naming.md
- .devcontrol/memory/session_digest_latest.md
- .devcontrol/memory/decision_log.jsonl
- .devcontrol/memory/glossary.md
- .devcontrol/memory/checkpoints/

Contenido minimo de la memoria:
- estado actual del producto;
- stack oficial;
- nombre oficial y naming tecnico;
- alcance MVP vigente;
- riesgos abiertos;
- modulos terminados, en progreso y bloqueados;
- decisiones tecnicas relevantes;
- supuestos vigentes;
- deuda tecnica reconocida;
- proximos pasos recomendados.

Politica de uso de memoria:
- al abrir una sesion, leer primero los resumenes cortos y no toda la base documental;
- releer documentos completos solo si el cambio impacta ese dominio;
- actualizar memoria al cierre de cada sesion significativa;
- marcar como obsoleta cualquier entrada contradicha por una decision posterior;
- nunca guardar secretos, tokens o datos sensibles en memoria resumida.

## 59. Registro diario de sesiones y checklist de solicitudes del usuario
Cada sesion debe dejar registro diario y convertir las solicitudes del usuario en checklist accionable. Esto permite comprobar cumplimiento real del plan y evita perder requerimientos entre sesiones.

Estructura recomendada:
- .devcontrol/sessions/YYYY-MM-DD/
- .devcontrol/sessions/YYYY-MM-DD/session-001.md
- .devcontrol/sessions/YYYY-MM-DD/session-001-checklist.md
- .devcontrol/sessions/YYYY-MM-DD/session-001-context.json
- .devcontrol/sessions/YYYY-MM-DD/session-001-diff-summary.md
- .devcontrol/sessions/YYYY-MM-DD/session-001-audit.jsonl
- .devcontrol/sessions/daily-summary.md

Cada registro de sesion debe contener:
- fecha y hora;
- objetivo declarado;
- solicitud original del usuario;
- alcance permitido;
- tareas derivadas;
- checklist de cumplimiento;
- archivos tocados;
- decisiones tomadas;
- riesgos detectados;
- validaciones ejecutadas;
- pendientes reales;
- estado final: completado, parcial o bloqueado.

Formato recomendado de checklist por sesion:
- item solicitado por el usuario;
- criterio de aceptacion;
- estado: pendiente, en progreso, completado, bloqueado;
- evidencia: archivo, diff, log o snapshot;
- observacion tecnica si hubo desviacion.

Reglas operativas del checklist:
- toda solicitud relevante del usuario debe convertirse en al menos un item verificable;
- no cerrar sesion sin marcar estado de cada item;
- si algo queda parcial, debe pasar a la siguiente sesion como pendiente explicito;
- si el plan cambia, debe registrarse el motivo;
- el resumen diario debe consolidar todo lo completado, lo pendiente y los riesgos nuevos.

Extensiones recomendadas del modelo de datos:
- session_requests: relacion entre solicitud del usuario y sesion;
- session_checklists: items, estado, evidencia y criterio de aceptacion;
- memory_entries: resumenes, vigencia, fuente y obsolescencia;
- daily_logs: consolidado por fecha;
- decision_log: decisiones de producto, arquitectura y branding.

Beneficio esperado:
- menos tokens gastados en reconstruir contexto;
- mejor continuidad entre sesiones;
- trazabilidad clara de lo pedido vs lo entregado;
- control real del avance del plan.
