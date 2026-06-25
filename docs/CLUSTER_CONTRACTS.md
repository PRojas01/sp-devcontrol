# SP-DevControl v2 — Contratos del Cluster

> Este archivo DEBE ser leído por todos los agentes del cluster antes de comenzar cualquier tarea.
> Define las constantes compartidas, puertos, URLs y firmas de funciones clave.
> Actualizar este archivo antes de cada ronda de desarrollo distribuido.

---

## Puertos y URLs (inmutables en v2)

| Servicio      | Puerto | URL base                    | Scope       |
|---------------|--------|-----------------------------|-------------|
| REST API      | 7891   | `http://127.0.0.1:7891`     | localhost   |
| MCP HTTP/SSE  | 7893   | `http://127.0.0.1:7893/mcp` | localhost   |
| WebSocket     | 7892   | `ws://127.0.0.1:7892`       | localhost   |
| Daemon PID    | —      | `~/.devcontrol/daemon.pid`  | filesystem  |

**Regla crítica:** El endpoint MCP es siempre `/mcp`, nunca `/sse`. El tipo de transporte es `sse` pero la ruta es `/mcp`.

---

## Firmas de funciones internas clave

```typescript
// session.ts
generateSessionId(date?: Date, counter?: number): string
createSession(id: string, project: string, agent: string, mode: SessionMode): Session

// storage.ts
getDb(dbPath: string): JsonDb
insertSession(db: JsonDb, session: Session): void
updateSession(db: JsonDb, session: Session): void
getSession(db: JsonDb, id: string): Session | null
listSessions(db: JsonDb, limit?: number): Session[]
insertChange(db: JsonDb, change: ChangeSet): void
getChange(db: JsonDb, changeId: string): ChangeSet | null
getChangesForSession(db: JsonDb, sessionId: string): ChangeSet[]
updateChangeStatus(db: JsonDb, changeId: string, status: string, commitHash?, rejectedBranch?, decisionMessage?): void
insertApproval(db: JsonDb, approval: ApprovalRecord): ApprovalRecord
listApprovals(db: JsonDb, sessionId?: string, activeOnly?: boolean): ApprovalRecord[]

// config.ts
loadConfig(projectRoot?: string): DevSentinelConfig   // default: process.cwd()
hasConfig(projectRoot?: string): boolean              // default: process.cwd()

// policy.ts
evaluatePathRisk(projectRoot: string, filePath: string): PolicyPathResult
evaluateCommandRisk(projectRoot: string, command: string): PolicyCommandResult

// preflight.ts
runPreflightChecks(projectRoot: string): PreflightResult
```

---

## Tipos clave

```typescript
interface ApprovalRecord {
  id?: number
  sessionId: string
  approvalType: 'command' | 'path' | 'change'
  target: string
  scope: 'session' | 'global'
  reason: string
  createdBy: 'user' | 'system'
  createdAt?: string
  revokedAt?: string
}

interface Session {
  id: string; project: string; agent: string; mode: SessionMode
  startedAt: string; endedAt?: string; objective?: string; status?: string
  totalChanges: number; approved: number; rejected: number
}

interface PreflightCheck {
  id: string; label: string; passed: boolean; severity: 'error' | 'warning' | 'info'; detail?: string
}

interface FileChange {
  filepath: string   // ← 'filepath', no 'path'
  eventType: 'modified' | 'added' | 'deleted_attempt'
  linesAdded: number; linesRemoved: number
  diffContent?: string; snapshotBefore?: string; snapshotAfter?: string
}

interface PolicyPathResult {
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  protected: boolean   // ← 'protected', no 'blocked'
  approved: boolean    // ← 'approved', no 'approvalSource'
  reason?: string
}

interface PolicyCommandResult {
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'   // ← 'decision', no 'risk'
  approvalSource?: string
  reason?: string
}
```

---

## Rutas de datos

```
DB por proyecto:    {projectRoot}/.devcontrol/storage/devcontrol.db.json
Global daemon:      ~/.devcontrol/daemon.pid | daemon.log | daemon-state.json
Global proyectos:   ~/.devcontrol/projects.json
```

---

## Daemon → API bridge

El daemon se lanza con la flag `__daemon_worker__` como argv[2] y lee
`DEVCONTROL_API_PORT` y `DEVCONTROL_WS_PORT` del entorno. Cuando cli.ts
detecta esa flag, llama `startApiServer(apiPort)` directamente sin parsear
el resto de comandos.

---

## Formato MCP

- Modo stdio: `devcontrol mcp:stdio` → para `claude mcp add devcontrol -- devcontrol mcp:stdio`
- Modo HTTP: `devcontrol mcp:serve [--port 7893]` → SSE en `http://localhost:7893/mcp`
- Config en editores:
  ```json
  { "mcpServers": { "devcontrol": { "type": "sse", "url": "http://localhost:7893/mcp" } } }
  ```

---

## Reglas para agentes del cluster

1. Leer este archivo completo antes de escribir cualquier módulo.
2. Usar los puertos, URLs y nombres de campo exactos definidos aquí.
3. Importar con extensión `.js` (ESM).
4. No crear nuevas constantes de puerto — usar las de este contrato.
5. Ejecutar `tsc --noEmit` sobre tu archivo antes de marcar la tarea completa.
6. Si defines una interfaz nueva que otros módulos necesitarán, añadirla aquí.
