# Change Log

## v2.0.0 — 2026-06-25

### Nuevos módulos
- **daemon.ts** — proceso background con PID file, SIGTERM/taskkill cross-platform
- **api.ts** — REST API Express en :7891, 10 endpoints, CORS localhost, multi-proyecto
- **mcp.ts** — servidor MCP con 6 tools: stdio (Claude Code) + HTTP/SSE :7893 (todos los editores)
- **skill.ts** — generador de skills/tools para 5 editores con deepMerge JSON inteligente

### Nuevos comandos CLI (37 total, +4 vs v1)
- `daemon start|stop|status` — gestión del proceso background
- `mcp:serve [--port]` — servidor MCP HTTP/SSE
- `mcp:stdio` — servidor MCP stdio para `claude mcp add`
- `skill:generate [--editor] [--mcp-port]` — genera archivos de integración

### Integraciones de editores
- Claude Code: slash command `/devcontrol`, hook PreToolUse, MCP server
- opencode: `opencode.json` con tool CLI + MCP SSE
- Cursor: `.cursor/mcp.json` (0.43+)
- Windsurf: `.windsurf/mcp.json` (1.8+)
- GitHub Copilot: `.github/copilot-instructions.md`

### Distribución
- Binarios standalone: `devcontrol-linux-x64` (53MB), `devcontrol-win-x64.exe` (45MB)
- Via npm: `npm install -g sp-devcontrol` (Node ≥18)
- Scripts cluster: build-binaries.sh, deploy-cluster.sh, install-deps-cluster.sh

### Mejoras técnicas
- Node.js requerido: ≥20 → ≥18 (compatible con workers del cluster)
- `inject` genera además: opencode.json, .cursor/mcp.json, .windsurf/mcp.json
- db singleton en API resuelto para multi-proyecto concurrente
- version en /health leída dinámicamente de package.json

### Correcciones (post-evaluación del cluster)
- URL MCP: /sse → /mcp (contrato unificado)
- Puertos daemon: 7700/7701 → 7891/7892 (alineado con API)
- fd leak en daemon.ts al fallar spawn
- Daemon worker wired to startApiServer() en cli.ts

