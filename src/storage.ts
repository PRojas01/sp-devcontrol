import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import type {
  Session,
  ChangeSet,
  SessionChecklistItem,
  SessionRequest,
  MemoryEntry,
  DailyLog,
  ApprovalRecord,
  SnapshotRecord,
} from './types.js'

export interface JsonDbState {
  sessions: Session[]
  changes: ChangeSet[]
  sessionRequests: SessionRequest[]
  sessionChecklists: SessionChecklistItem[]
  memoryEntries: MemoryEntry[]
  dailyLogs: DailyLog[]
  approvals: ApprovalRecord[]
  snapshots: SnapshotRecord[]
  counters: Record<string, number>
}

export class JsonDb {
  constructor(public path: string, public state: JsonDbState) {}
}

let db: JsonDb | null = null

function emptyState(): JsonDbState {
  return {
    sessions: [],
    changes: [],
    sessionRequests: [],
    sessionChecklists: [],
    memoryEntries: [],
    dailyLogs: [],
    approvals: [],
    snapshots: [],
    counters: {
      request: 0,
      checklist: 0,
      memory: 0,
      daily: 0,
      approval: 0,
      snapshot: 0,
    },
  }
}

function persist(database: JsonDb): void {
  const data = JSON.stringify(database.state, null, 2)
  const tmpPath = database.path + '.tmp'
  writeFileSync(tmpPath, data, 'utf-8')
  renameSync(tmpPath, database.path)
}

function nextId(database: JsonDb, key: keyof JsonDbState['counters']): number {
  database.state.counters[key] = (database.state.counters[key] ?? 0) + 1
  return database.state.counters[key]
}

function tryReadState(filePath: string): JsonDbState | null {
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as JsonDbState
  } catch {
    return null
  }
}

function validateState(state: JsonDbState): JsonDbState {
  const defaults = emptyState()
  for (const key of Object.keys(defaults) as (keyof JsonDbState)[]) {
    if (key === 'counters') {
      state.counters = { ...defaults.counters, ...(state.counters ?? {}) }
    } else if (!Array.isArray(state[key])) {
      (state as unknown as Record<string, unknown>)[key] = defaults[key]
    }
  }
  return state
}

export function getDb(dbPath: string): JsonDb {
  if (db) return db
  const resolved = resolve(dbPath.endsWith('.json') ? dbPath : `${dbPath}.json`)
  const dir = dirname(resolved)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  let state = tryReadState(resolved)
  if (!state) {
    const tmpPath = resolved + '.tmp'
    state = tryReadState(tmpPath)
  }
  if (!state) {
    const bakPath = resolved + '.bak'
    state = tryReadState(bakPath)
  }
  if (!state) state = emptyState()

  state = validateState(state)

  if (existsSync(resolved)) {
    try {
      copyFileSync(resolved, resolved + '.bak')
    } catch { /* non-critical */ }
  }

  db = new JsonDb(resolved, state)
  persist(db)
  return db
}

export function closeDb(): void {
  if (db) {
    persist(db)
    db = null
  }
}

export function insertSession(database: JsonDb, session: Session): void {
  database.state.sessions.push({ ...session })
  persist(database)
}

export function updateSession(database: JsonDb, session: Session): void {
  const idx = database.state.sessions.findIndex(item => item.id === session.id)
  if (idx >= 0) database.state.sessions[idx] = { ...session }
  persist(database)
}

export function getSession(database: JsonDb, id: string): Session | null {
  return database.state.sessions.find(session => session.id === id) ?? null
}

export function listSessions(database: JsonDb, limit = 20): Session[] {
  return [...database.state.sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit)
}

export function insertChange(database: JsonDb, change: ChangeSet): void {
  database.state.changes.push({ ...change })
  persist(database)
}

export function updateChangeStatus(
  database: JsonDb,
  changeId: string,
  status: string,
  commitHash?: string,
  rejectedBranch?: string,
  decisionMessage?: string,
): void {
  const change = database.state.changes.find(item => item.id === changeId)
  if (change) {
    change.status = status as ChangeSet['status']
    change.decisionAt = new Date().toISOString()
    change.commitHash = commitHash
    change.rejectedBranch = rejectedBranch
    change.decisionMessage = decisionMessage
  }
  persist(database)
}

export function getChangesForSession(database: JsonDb, sessionId: string): ChangeSet[] {
  return database.state.changes.filter(change => change.sessionId === sessionId)
}

export function getChange(database: JsonDb, changeId: string): ChangeSet | null {
  return database.state.changes.find(change => change.id === changeId) ?? null
}

export function insertSessionRequest(database: JsonDb, request: SessionRequest): void {
  database.state.sessionRequests.push({
    ...request,
    id: nextId(database, 'request'),
    createdAt: new Date().toISOString(),
  })
  persist(database)
}

export function listSessionRequests(database: JsonDb, sessionId: string): SessionRequest[] {
  return database.state.sessionRequests.filter(request => request.sessionId === sessionId)
}

export function insertChecklistItems(database: JsonDb, items: SessionChecklistItem[]): void {
  for (const item of items) {
    database.state.sessionChecklists.push({
      ...item,
      id: nextId(database, 'checklist'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
  persist(database)
}

export function listChecklistItems(database: JsonDb, sessionId: string): SessionChecklistItem[] {
  return database.state.sessionChecklists.filter(item => item.sessionId === sessionId)
}

export function updateChecklistItem(
  database: JsonDb,
  id: number,
  status: SessionChecklistItem['status'],
  evidence?: string,
  notes?: string,
): void {
  const item = database.state.sessionChecklists.find(entry => entry.id === id)
  if (item) {
    item.status = status
    if (evidence !== undefined) item.evidence = evidence
    if (notes !== undefined) item.notes = notes
    item.updatedAt = new Date().toISOString()
  }
  persist(database)
}

export function upsertMemoryEntry(database: JsonDb, entry: MemoryEntry): void {
  const existing = database.state.memoryEntries.find(item => item.key === entry.key)
  if (existing) {
    existing.content = entry.content
    existing.source = entry.source
    existing.isObsolete = entry.isObsolete ?? false
    existing.updatedAt = new Date().toISOString()
  } else {
    database.state.memoryEntries.push({
      ...entry,
      id: nextId(database, 'memory'),
      updatedAt: new Date().toISOString(),
    })
  }
  persist(database)
}

export function listMemoryEntries(database: JsonDb): MemoryEntry[] {
  return database.state.memoryEntries
}

export function upsertDailyLog(database: JsonDb, log: DailyLog): void {
  const existing = database.state.dailyLogs.find(item => item.logDate === log.logDate)
  if (existing) {
    existing.summary = log.summary
    existing.completedCount = log.completedCount
    existing.pendingCount = log.pendingCount
    existing.blockedCount = log.blockedCount
    existing.updatedAt = new Date().toISOString()
  } else {
    database.state.dailyLogs.push({
      ...log,
      id: nextId(database, 'daily'),
      updatedAt: new Date().toISOString(),
    })
  }
  persist(database)
}

export function insertApproval(database: JsonDb, approval: ApprovalRecord): ApprovalRecord {
  const stored: ApprovalRecord = {
    ...approval,
    id: nextId(database, 'approval'),
    createdAt: new Date().toISOString(),
  }
  database.state.approvals.push(stored)
  persist(database)
  return stored
}

export function listApprovals(database: JsonDb, sessionId?: string, activeOnly = true): ApprovalRecord[] {
  return database.state.approvals.filter(approval => {
    if (sessionId && approval.sessionId !== sessionId) return false
    if (activeOnly && approval.revokedAt) return false
    return true
  })
}

export function revokeApproval(database: JsonDb, id: number): ApprovalRecord | null {
  const approval = database.state.approvals.find(entry => entry.id === id)
  if (!approval) return null
  approval.revokedAt = new Date().toISOString()
  persist(database)
  return approval
}

export function insertSnapshot(database: JsonDb, snapshot: SnapshotRecord): SnapshotRecord {
  const stored: SnapshotRecord = {
    ...snapshot,
    id: nextId(database, 'snapshot'),
    createdAt: new Date().toISOString(),
  }
  database.state.snapshots.push(stored)
  persist(database)
  return stored
}

export function listSnapshots(database: JsonDb, sessionId?: string): SnapshotRecord[] {
  return database.state.snapshots.filter(snapshot => !sessionId || snapshot.sessionId === sessionId)
}

export function getSnapshot(database: JsonDb, id: number): SnapshotRecord | null {
  return database.state.snapshots.find(snapshot => snapshot.id === id) ?? null
}
