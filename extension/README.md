# SP-DevControl editor extension

VS Code-compatible extension for SP-DevControl. It adds a DevControl tab in the Activity Bar with commands for project status, gates, preflight, compliance, editor config injection, daemon control and MCP setup.

The extension is a thin adapter over the CLI/MCP server. Install the CLI first:

```bash
npm install -g sp-devcontrol
```

## Package VSIX

```bash
cd extension
npm install
npm run validate
npm run package
```

The `npm run package` command uses `vsce package` through `@vscode/vsce` and generates `sp-devcontrol-editor-2.1.0.vsix`.

Install it in VS Code:

```bash
code --install-extension sp-devcontrol-editor-2.1.0.vsix
```

Cursor and Windsurf can install the same VSIX through their VS Code-compatible extension installer.

## MCP

Use the `DevControl: Write MCP Config` command from the command palette or the panel to write local MCP config files:

- `.mcp.json`
- `.cursor/mcp.json`
- `.windsurf/mcp.json`

The generated config uses the real stdio MCP server:

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

For HTTP MCP, run `DevControl: Start MCP HTTP Server`; it opens an editor terminal with `sp-devcontrol mcp:serve --port 7893`.
