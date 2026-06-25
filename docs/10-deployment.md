# SP-DevControl v2 — Guía de Despliegue

> Puertos de referencia: REST API `:7891`, WebSocket `:7892`, MCP HTTP/SSE `:7893`.
> Todos los servicios escuchan en `127.0.0.1` únicamente.

---

## 1. Instalación via npm (recomendado)

Requiere Node.js ≥18.

```bash
npm install -g sp-devcontrol

# Verificar instalación
devcontrol --version
devcontrol preflight
```

Para actualizar:

```bash
npm update -g sp-devcontrol
```

---

## 2. Binario standalone — Linux

No requiere Node.js en la máquina destino.

```bash
# Descargar el binario
curl -L https://github.com/tu-org/sp-devcontrol/releases/latest/download/devcontrol-linux-x64 \
  -o /usr/local/bin/devcontrol

chmod +x /usr/local/bin/devcontrol

# Verificar
devcontrol --version
```

Tamaño aproximado: 53 MB (incluye runtime Node.js y addon SQLite nativo).

---

## 3. Binario standalone — Windows

No requiere Node.js en la máquina destino.

```powershell
# PowerShell — descargar a una carpeta en PATH
Invoke-WebRequest `
  -Uri "https://github.com/tu-org/sp-devcontrol/releases/latest/download/devcontrol-win-x64.exe" `
  -OutFile "$env:LOCALAPPDATA\Programs\devcontrol\devcontrol.exe"

# Añadir al PATH si no está ya
[Environment]::SetEnvironmentVariable(
  "PATH",
  "$env:PATH;$env:LOCALAPPDATA\Programs\devcontrol",
  "User"
)

# Verificar (nueva terminal)
devcontrol --version
```

Tamaño aproximado: 45 MB.

---

## 4. Despliegue en cluster (múltiples workers)

Los scripts en `scripts/` automatizan el despliegue distribuido.

```bash
# 1. Instalar dependencias en todos los nodos
./scripts/install-deps-cluster.sh

# 2. Compilar binarios para distribución
./scripts/build-binaries.sh
# Genera: dist/devcontrol-linux-x64, dist/devcontrol-win-x64.exe

# 3. Desplegar a los nodos del cluster
./scripts/deploy-cluster.sh
```

Consultar `docs/CLUSTER_CONTRACTS.md` para los contratos de puertos y URLs que deben respetar todos los workers.

---

## 5. Configurar como MCP server en Claude Code

### Modo stdio (recomendado para Claude Code)

```bash
claude mcp add devcontrol -- devcontrol mcp:stdio
```

Claude Code lanzará el proceso `devcontrol mcp:stdio` automáticamente al iniciar una sesión. No requiere que el daemon esté corriendo.

### Verificar la integración

```bash
claude mcp list
# Debe aparecer: devcontrol (stdio)
```

El slash command `/devcontrol` estará disponible en Claude Code tras reiniciar la sesión.

---

## 6. Configurar como MCP server en opencode, Cursor y Windsurf

### Opción A — Generación automática

```bash
# Desde la raíz del proyecto
devcontrol skill:generate --mcp-port 7893

# O para un editor específico
devcontrol skill:generate --editor cursor --mcp-port 7893
devcontrol skill:generate --editor windsurf --mcp-port 7893
devcontrol skill:generate --editor opencode --mcp-port 7893
```

Esto requiere que el daemon esté corriendo para servir el endpoint MCP HTTP/SSE:

```bash
devcontrol daemon start
# o en foreground:
devcontrol mcp:serve --port 7893
```

### Opción B — Configuración manual

Añadir al archivo de configuración del editor:

**Cursor** — `.cursor/mcp.json` (requiere Cursor 0.43+):

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

**Windsurf** — `.windsurf/mcp.json` (requiere Windsurf 1.8+):

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

**opencode** — `opencode.json` en la raíz del proyecto:

```json
{
  "mcp": {
    "servers": {
      "devcontrol": {
        "type": "sse",
        "url": "http://localhost:7893/mcp"
      }
    }
  }
}
```

> **Nota crítica:** La ruta del endpoint MCP es siempre `/mcp`, nunca `/sse`. El tipo de transporte es `sse` pero la ruta es `/mcp`. Ver `docs/CLUSTER_CONTRACTS.md`.

---

## 7. Daemon como systemd user unit (Linux)

Permite que el daemon arranque automáticamente con la sesión del usuario y se reinicie en caso de fallo.

### Crear la unidad

```bash
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/devcontrol.service << 'EOF'
[Unit]
Description=SP-DevControl daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/devcontrol daemon start
ExecStop=/usr/local/bin/devcontrol daemon stop
Restart=on-failure
RestartSec=3s
Environment=DEVCONTROL_API_PORT=7891
Environment=DEVCONTROL_WS_PORT=7892

[Install]
WantedBy=default.target
EOF
```

### Activar y arrancar

```bash
# Recargar la configuración de systemd
systemctl --user daemon-reload

# Habilitar arranque automático con la sesión
systemctl --user enable devcontrol.service

# Arrancar ahora
systemctl --user start devcontrol.service

# Verificar estado
systemctl --user status devcontrol.service
devcontrol daemon status
```

### Habilitar lingering (arranque sin sesión activa)

Si el daemon debe correr aunque no haya sesión de escritorio activa:

```bash
loginctl enable-linger $USER
```

### Logs

```bash
journalctl --user -u devcontrol.service -f

# O directamente:
tail -f ~/.devcontrol/daemon.log
```

### Desactivar

```bash
systemctl --user stop devcontrol.service
systemctl --user disable devcontrol.service
```

---

## Referencia rápida de puertos

| Servicio     | Puerto | URL                          |
|--------------|--------|------------------------------|
| REST API     | 7891   | `http://127.0.0.1:7891`      |
| WebSocket    | 7892   | `ws://127.0.0.1:7892`        |
| MCP HTTP/SSE | 7893   | `http://127.0.0.1:7893/mcp`  |

---

## Diagnóstico rápido

```bash
# Estado del daemon y servicios
devcontrol daemon status

# Comprobaciones pre-vuelo del proyecto
devcontrol preflight

# Verificar API
curl http://127.0.0.1:7891/health

# Verificar MCP SSE (debe devolver headers text/event-stream)
curl -N http://127.0.0.1:7893/mcp
```
