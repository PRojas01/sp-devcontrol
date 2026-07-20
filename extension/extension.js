const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const VIEW_ID = 'sp-devcontrol.panel';
const OUTPUT_NAME = 'SP-DevControl';

function activate(context) {
  const output = vscode.window.createOutputChannel(OUTPUT_NAME);
  const provider = new DevControlViewProvider(context.extensionUri, output);

  context.subscriptions.push(
    output,
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
    registerCommand('sp-devcontrol.openPanel', () => vscode.commands.executeCommand('workbench.view.extension.sp-devcontrol')),
    registerCommand('sp-devcontrol.projectStatus', () => provider.runCli(['project:status'])),
    registerCommand('sp-devcontrol.gateStatus', () => provider.runCli(['gate:status'])),
    registerCommand('sp-devcontrol.projectCheck', () => provider.runCli(['project:check'])),
    registerCommand('sp-devcontrol.complianceReport', () => provider.runCli(['report:compliance'])),
    registerCommand('sp-devcontrol.inject', () => provider.runCli(['inject'])),
    registerCommand('sp-devcontrol.daemonStart', () => provider.runCli(['daemon', 'start'])),
    registerCommand('sp-devcontrol.daemonStatus', () => provider.runCli(['daemon', 'status'])),
    registerCommand('sp-devcontrol.daemonStop', () => provider.runCli(['daemon', 'stop'])),
    registerCommand('sp-devcontrol.startMcpHttp', () => provider.startMcpHttp()),
    registerCommand('sp-devcontrol.writeMcpConfig', () => provider.writeMcpConfig())
  );
}

function deactivate() {}

function registerCommand(id, callback) {
  return vscode.commands.registerCommand(id, callback);
}

class DevControlViewProvider {
  constructor(extensionUri, output) {
    this.extensionUri = extensionUri;
    this.output = output;
    this.view = undefined;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      if (!message || typeof message.command !== 'string') return;
      this.handleMessage(message.command);
    });
  }

  handleMessage(command) {
    const actions = {
      status: () => this.runCli(['project:status']),
      gates: () => this.runCli(['gate:status']),
      preflight: () => this.runCli(['project:check']),
      compliance: () => this.runCli(['report:compliance']),
      inject: () => this.runCli(['inject']),
      daemonStart: () => this.runCli(['daemon', 'start']),
      daemonStatus: () => this.runCli(['daemon', 'status']),
      daemonStop: () => this.runCli(['daemon', 'stop']),
      mcpHttp: () => this.startMcpHttp(),
      mcpConfig: () => this.writeMcpConfig(),
    };
    const action = actions[command];
    if (action) action();
  }

  runCli(args) {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showWarningMessage('Open a workspace before running DevControl.');
      return;
    }

    const cliPath = getCliPath();
    this.setBusy(true);
    this.append(`$ ${cliPath} ${args.join(' ')}\n`);

    const child = spawn(cliPath, args, {
      cwd: workspaceRoot,
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DEVCONTROL_PROJECT_ROOT: workspaceRoot,
      },
    });

    child.stdout.on('data', (chunk) => this.append(chunk.toString()));
    child.stderr.on('data', (chunk) => this.append(chunk.toString()));
    child.on('error', (error) => {
      this.append(`\nError: ${error.message}\n`);
      this.setBusy(false);
      vscode.window.showErrorMessage(`DevControl failed: ${error.message}`);
    });
    child.on('close', (code) => {
      this.append(`\nExit code: ${code}\n`);
      this.setBusy(false);
      if (code === 0) {
        vscode.window.showInformationMessage(`DevControl command completed: ${args.join(' ')}`);
      } else {
        vscode.window.showErrorMessage(`DevControl command failed: ${args.join(' ')}`);
      }
    });
  }

  startMcpHttp() {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showWarningMessage('Open a workspace before starting MCP.');
      return;
    }

    const cliPath = getCliPath();
    const port = vscode.workspace.getConfiguration('spDevcontrol').get('mcpPort', 7893);
    const terminal = vscode.window.createTerminal({
      name: 'DevControl MCP',
      cwd: workspaceRoot,
      env: {
        DEVCONTROL_PROJECT_ROOT: workspaceRoot,
      },
    });
    terminal.sendText(`${quoteForShell(cliPath)} mcp:serve --port ${port}`);
    terminal.show();
    this.append(`Started MCP terminal: ${cliPath} mcp:serve --port ${port}\n`);
  }

  writeMcpConfig() {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showWarningMessage('Open a workspace before writing MCP config.');
      return;
    }

    const cliPath = getCliPath();
    const devcontrolServer = {
      type: 'stdio',
      command: cliPath,
      args: ['mcp:stdio'],
    };

    const targets = [
      path.join(workspaceRoot, '.mcp.json'),
      path.join(workspaceRoot, '.cursor', 'mcp.json'),
      path.join(workspaceRoot, '.windsurf', 'mcp.json'),
    ];

    for (const target of targets) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const config = readJsonFile(target);
      config.mcpServers = {
        ...(isObject(config.mcpServers) ? config.mcpServers : {}),
        devcontrol: devcontrolServer,
      };
      fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    }

    this.append(`Wrote MCP config:\n${targets.map((target) => `- ${target}`).join('\n')}\n`);
    vscode.window.showInformationMessage('DevControl MCP config written for VS Code-compatible editors.');
  }

  append(text) {
    this.output.append(text);
    this.output.show(true);
    if (this.view) {
      this.view.webview.postMessage({ type: 'output', text });
    }
  }

  setBusy(isBusy) {
    if (this.view) {
      this.view.webview.postMessage({ type: 'busy', isBusy });
    }
  }

  renderHtml(webview) {
    const nonce = createNonce();
    const cspSource = webview.cspSource;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>SP-DevControl</title>
  <style>
    :root {
      color-scheme: light dark;
      --gap: 10px;
    }
    body {
      margin: 0;
      padding: 14px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--gap);
      margin-bottom: 14px;
    }
    h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 650;
    }
    .status {
      min-width: 64px;
      text-align: right;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    button {
      width: 100%;
      min-height: 32px;
      padding: 6px 8px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
      text-align: left;
      font: inherit;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .section {
      margin-top: 16px;
      margin-bottom: 8px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      font-weight: 650;
      text-transform: uppercase;
    }
    pre {
      min-height: 96px;
      max-height: 260px;
      overflow: auto;
      margin: 14px 0 0;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-editor-background);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SP-DevControl</h1>
    <div class="status" id="status">Ready</div>
  </div>

  <div class="section">Project</div>
  <div class="grid">
    <button data-command="status">Project status</button>
    <button data-command="gates">Gate status</button>
    <button data-command="preflight">Run preflight</button>
    <button data-command="compliance">Compliance report</button>
    <button data-command="inject" class="secondary">Inject editor config</button>
  </div>

  <div class="section">Runtime</div>
  <div class="grid">
    <button data-command="daemonStart">Start daemon</button>
    <button data-command="daemonStatus">Daemon status</button>
    <button data-command="daemonStop" class="secondary">Stop daemon</button>
  </div>

  <div class="section">MCP</div>
  <div class="grid">
    <button data-command="mcpHttp">Start MCP HTTP server</button>
    <button data-command="mcpConfig" class="secondary">Write MCP config</button>
  </div>

  <pre id="output"></pre>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const status = document.getElementById('status');
    const output = document.getElementById('output');

    document.querySelectorAll('button[data-command]').forEach((button) => {
      button.addEventListener('click', () => {
        vscode.postMessage({ command: button.dataset.command });
      });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message) return;
      if (message.type === 'busy') {
        status.textContent = message.isBusy ? 'Running' : 'Ready';
      }
      if (message.type === 'output') {
        output.textContent += message.text;
        output.scrollTop = output.scrollHeight;
      }
    });
  </script>
</body>
</html>`;
  }
}

function getWorkspaceRoot() {
  const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  return folder ? folder.uri.fsPath : undefined;
}

function getCliPath() {
  return vscode.workspace.getConfiguration('spDevcontrol').get('cliPath', 'sp-devcontrol');
}

function quoteForShell(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return `"${value.replace(/(["$`\\])/g, '\\$1')}"`;
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

module.exports = {
  activate,
  deactivate,
};
