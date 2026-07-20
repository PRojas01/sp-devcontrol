# Instalación de DevControl por editor

DevControl es una CLI con servidor MCP integrado. Las superficies de integración son: CLI, MCP server, plugin Claude, skill Codex, connector para ChatGPT Desktop y extensión VS Code-compatible para panel dentro del editor.

---

## 1. Claude Code (plugin)

```bash
# Opción A — desde el repositorio (desarrollo)
cp -r .claude-plugin ~/.claude/plugins/sp-devcontrol

# Opción B — instalar el MCP en .mcp.json (ya existe en el repo)
# El archivo .mcp.json configura el servidor MCP automáticamente.
```

El plugin registra el MCP server `devcontrol` y el skill `govern-changes` en `.claude/skills/govern-changes/SKILL.md`.

**Uso:** Dentro de Claude Code, el skill se carga automáticamente cuando el usuario pide tareas de gobernanza. Las herramientas MCP están disponibles sin configuración adicional.

---

## 2. Codex (OpenAI)

```bash
# Agregar el MCP server
codex mcp add devcontrol sp-devcontrol mcp

# O configurar manualmente en .codex/config.toml (ya incluido en el repo)
```

El archivo `.codex/config.toml` define el servidor MCP y `.codex/AGENTS.md` establece las reglas de gobernanza para agentes Codex.

**Uso:** Codex conecta automáticamente al MCP y expone las herramientas de gobernanza.

---

## 3. opencode

El archivo `opencode.json` en la raíz del proyecto configura DevControl como herramienta MCP. opencode lo detecta automáticamente al abrir el directorio del proyecto.

```json
{
  "mcpServers": {
    "devcontrol": {
      "type": "sse",
      "url": "http://localhost:7893/mcp"
    }
  }
}
```

**Nota:** El MCP server debe estar ejecutándose. Iniciar con:
```bash
sp-devcontrol daemon
# o
sp-devcontrol mcp
```

---

## 4. ChatGPT Desktop (connector MCP)

ChatGPT Desktop soporta conectores MCP. Para usar DevControl:

1. Asegúrate de que el MCP server esté ejecutándose en `http://localhost:7893/mcp`.
2. En ChatGPT Desktop, ve a **Settings > Connectors**.
3. Agrega un conector personalizado con URL: `http://localhost:7893/mcp`.
4. Las herramientas de DevControl aparecerán disponibles en la conversación.

**Importante:** DevControl no tiene API HTTP propia. La única interfaz remota es el MCP. ChatGPT web (navegador) NO soporta conectores MCP; esta funcionalidad solo está disponible en ChatGPT Desktop.

---

## 5. Servidor MCP standalone

Si necesitas ejecutar el MCP server independientemente:

```bash
# Modo stdio (para integración con herramientas que lo gestionan)
sp-devcontrol mcp

# Modo daemon HTTP (puerto 7893)
sp-devcontrol daemon
```

El servidor expone estas herramientas:

| Tool | Descripción |
|------|-------------|
| `devcontrol_status` | Estado del proyecto, preflight, sesión activa |
| `devcontrol_session_start` | Iniciar sesión de gobernanza |
| `devcontrol_approve_change` | Aprobar cambio pendiente |
| `devcontrol_reject_change` | Rechazar cambio pendiente |
| `devcontrol_policy_check` | Evaluar riesgo de path/command |
| `devcontrol_compliance_report` | Reporte de cumplimiento completo |

---

## 6. VS Code / Cursor / Windsurf (extensión VSIX)

La carpeta `extension/` contiene una extensión compatible con VS Code y forks como Cursor y Windsurf. Añade una pestaña DevControl en la Activity Bar y ejecuta el CLI/MCP real del módulo desde el workspace abierto.

```bash
# 1. Instalar la CLI que invoca la extensión
npm install -g sp-devcontrol

# 2. Empaquetar la extensión
cd extension
npm run package

# 3. Instalar el VSIX generado
code --install-extension sp-devcontrol-editor-2.1.0.vsix
```

En Cursor/Windsurf usa el instalador de extensiones VSIX del editor o su comando equivalente. Desde la pestaña DevControl puedes ejecutar estado del proyecto, gates, preflight, reporte de compliance, `inject`, daemon y generación de config MCP local.

Para asistentes del editor que consumen MCP por stdio:

```json
{
  "mcpServers": {
    "devcontrol": {
      "type": "stdio",
      "command": "sp-devcontrol",
      "args": ["mcp:stdio"]
    }
  }
}
```

---

## Requisitos previos

- Node.js >= 18
- DevControl inicializado en el proyecto: `sp-devcontrol init`
- Para HTTP: token de autenticación en `~/.devcontrol/api-token` (chmod 600)
- Para la extensión: CLI `sp-devcontrol` disponible en `PATH`

## Verificación

```bash
# Verificar que la CLI funciona
sp-devcontrol status

# Verificar que el MCP responde
curl -s http://localhost:7893/health
```
