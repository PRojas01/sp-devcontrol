# SP-DevControl v2

Capa local de gobernanza para proyectos de desarrollo asistido por IA.

Valida el proyecto antes del primer prompt, impone diseño primero, monitorea cambios en tiempo real, clasifica riesgo, exige aprobaciones, genera snapshots y garantiza cumplimiento normativo (OWASP, RGPD, ISO 27001, CWE, SLSA).

**v2 añade:** daemon de background, REST API en :7891, servidor MCP en :7893 (Claude Code, opencode, Cursor, Windsurf), binarios standalone sin Node.

## Instalación

```bash
# Desde npm
npm install -g sp-devcontrol

# Binario standalone (sin Node requerido)
curl -L https://github.com/SolucionesPro/sp-devcontrol/releases/latest/download/devcontrol-linux-x64 -o devcontrol
chmod +x devcontrol && sudo mv devcontrol /usr/local/bin/
```

Compatible Linux x64/ARM64 y Windows x64. Node.js ≥ 18 si usas npm.

## Inicio rápido

```bash
# Inicializar proyecto
sp-devcontrol init --project-name mi-proyecto

# Verificar salud del proyecto
sp-devcontrol project:check

# Completar docs/ con diseño real, luego:
sp-devcontrol session:start --objective "implementar feature X"

# Monitorear cambios
sp-devcontrol watch:start --session <id>

# Aprobar/rechazar cambios
sp-devcontrol session:change:approve --change-id <id>
sp-devcontrol session:change:reject --change-id <id>

# Cerrar sesión
sp-devcontrol session:close --session <id>
```

## Integración con editores agénticos (MCP)

### Claude Code
```bash
# Añadir como MCP server
claude mcp add devcontrol -- devcontrol mcp:stdio
# O en modo HTTP (requiere daemon activo)
# En .claude/mcp.json: { "mcpServers": { "devcontrol": { "type": "sse", "url": "http://localhost:7893/mcp" } } }
```

### opencode / Cursor / Windsurf
```bash
# Genera configs para todos los editores
devcontrol skill:generate --mcp-port 7893
# Arranca el servidor MCP
devcontrol mcp:serve
```

### Daemon (background)
```bash
devcontrol daemon start     # arranca API :7891 + MCP :7893
devcontrol daemon status    # verifica que está corriendo
devcontrol daemon stop
```

## Comandos

### Proyecto
- `init` — Inicializar estructura de gobernanza
- `project:status` — Estado del proyecto
- `project:check` — Preflight completo con detección de fase

### Políticas
- `policy:path` — Evaluar riesgo de una ruta
- `policy:command` — Evaluar un comando
- `policy:protected:list|add|remove` — Rutas protegidas
- `policy:command:approved:list|approve|revoke` — Comandos aprobados

### Sesiones
- `session:start` — Iniciar sesión gobernada (con preflight)
- `session:check` — Verificar tokens y refrescar contexto
- `session:checklist:update` — Actualizar checklist
- `session:close` — Cerrar sesión

### Cambios
- `session:changes:list` — Listar cambios detectados
- `session:change:show` — Detalle de un cambio
- `session:change:approve` — Aprobar cambio
- `session:change:reject` — Rechazar y rollback

### Aprobaciones
- `session:approval:list|grant|revoke` — Gestionar aprobaciones

### Snapshots
- `snapshot:create` — Snapshot manual
- `session:snapshots:list` — Listar snapshots
- `session:rollback` — Rollback por cambio o sesión

### Monitoreo
- `watch:start` — Iniciar monitoreo de archivos

### Hooks
- `hooks:install` — Instalar Git hooks
- `hooks:uninstall` — Desinstalar hooks
- `hooks:status` — Estado de hooks

### Reglas e inyección
- `inject` — Generar reglas para editores agénticos

### Reportes
- `report:compliance` — Reporte de cumplimiento normativo
- `report:session` — Reporte detallado de sesión

## Normativas soportadas

OWASP Top 10, RGPD, ISO 27001, CWE, SLSA — 36 controles en 8 categorías.

## Licencia

MIT
