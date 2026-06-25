# SP-DevControl - Estado de Integraciones

## Editores
- Cursor: planificado, sin integracion activa.
- Claude Code: planificado, sin integracion activa.
- GitHub Copilot: planificado, sin integracion activa.
- VS Code: planificado, sin integracion activa.

## Conectores y tooling activos en el prototipo
- filesystem local: usado implicitamente por la CLI.
- git local via simple-git: operativo.
- monitor de archivos via chokidar: operativo.
- backend portable JSON: operativo.

## Conectores y tooling previstos
- sqlite real: pendiente.
- filesystem MCP: recomendado.
- git MCP: recomendado.
- sqlite MCP: recomendado.
- github MCP: opcional.
- editor bridge MCP: futuro.

## Observaciones
- La siguiente integracion critica no es con un editor; es con hooks Git para enforcement real.
