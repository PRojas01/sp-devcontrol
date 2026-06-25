/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
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
import type { JsonDb } from './storage.js'

export class SqliteDb {
  constructor(public path: string, public db: Database.Database) {}
}

export type AnyDb = JsonDb | SqliteDb

let instance: SqliteDb | null = null

function createTables(db: Database.Database): void {
  db.pragma('journal_mode=WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      agent TEXT NOT NULL,
      mode TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      objective TEXT,
      status TEXT,
      total_changes INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 0,
      rejected INTEGER NOT NULL DEFAULT 0,
      allowed_scope TEXT,
      token_budget INTEGER,
      token_estimate INTEGER
    );

    CREATE TABLE IF NOT EXISTS changes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      agent TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      status TEXT NOT NULL,
      files TEXT NOT NULL,
      deps_added TEXT NOT NULL,
      deps_invalid TEXT NOT NULL,
      control_violations TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      decision_at TEXT,
      commit_hash TEXT,
      rejected_branch TEXT,
      decision_message TEXT
    );

    CREATE TABLE IF NOT EXISTS session_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      request_text TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      item_text TEXT NOT NULL,
      acceptance_criteria TEXT NOT NULL,
      status TEXT NOT NULL,
      evidence TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      is_obsolete INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date TEXT UNIQUE NOT NULL,
      summary TEXT NOT NULL,
      completed_count INTEGER NOT NULL DEFAULT 0,
      pending_count INTEGER NOT NULL DEFAULT 0,
      blocked_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      approval_type TEXT NOT NULL,
      target TEXT NOT NULL,
      scope TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      label TEXT NOT NULL,
      source TEXT NOT NULL,
      change_id TEXT,
      manifest_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
}

export function getDb(dbPath: string): SqliteDb {
  if (instance) return instance

  const base = dbPath.replace(/\.json$/, '')
  const resolved = resolve(`${base}.sqlite`)
  const dir = dirname(resolved)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const db = new Database(resolved)
  createTables(db)

  instance = new SqliteDb(resolved, db)
  return instance
}

export function closeDb(): void {
  if (instance) {
    instance.db.close()
    instance = null
  }
}

export function insertSession(db: SqliteDb, session: Session): void {
  db.db.prepare(`
    INSERT INTO sessions (id, project, agent, mode, started_at, ended_at, objective, status,
      total_changes, approved, rejected, allowed_scope, token_budget, token_estimate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.project,
    session.agent,
    session.mode,
    session.startedAt,
    session.endedAt ?? null,
    session.objective ?? null,
    session.status ?? null,
    session.totalChanges,
    session.approved,
    session.rejected,
    session.allowedScope ? JSON.stringify(session.allowedScope) : null,
    session.tokenBudget ?? null,
    session.tokenEstimate ?? null,
  )
}

export function updateSession(db: SqliteDb, session: Session): void {
  db.db.prepare(`
    UPDATE sessions SET
      project = ?, agent = ?, mode = ?, started_at = ?, ended_at = ?, objective = ?, status = ?,
      total_changes = ?, approved = ?, rejected = ?, allowed_scope = ?, token_budget = ?, token_estimate = ?
    WHERE id = ?
  `).run(
    session.project,
    session.agent,
    session.mode,
    session.startedAt,
    session.endedAt ?? null,
    session.objective ?? null,
    session.status ?? null,
    session.totalChanges,
    session.approved,
    session.rejected,
    session.allowedScope ? JSON.stringify(session.allowedScope) : null,
    session.tokenBudget ?? null,
    session.tokenEstimate ?? null,
    session.id,
  )
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    project: row.project as string,
    agent: row.agent as string,
    mode: row.mode as Session['mode'],
    startedAt: row.started_at as string,
    endedAt: row.ended_at as string | undefined ?? undefined,
    objective: row.objective as string | undefined ?? undefined,
    status: row.status as Session['status'] ?? undefined,
    totalChanges: row.total_changes as number,
    approved: row.approved as number,
    rejected: row.rejected as number,
    allowedScope: row.allowed_scope ? JSON.parse(row.allowed_scope as string) as string[] : undefined,
    tokenBudget: row.token_budget as number | undefined ?? undefined,
    tokenEstimate: row.token_estimate as number | undefined ?? undefined,
  }
}

export function getSession(db: SqliteDb, id: string): Session | null {
  const row = db.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToSession(row) : null
}

export function listSessions(db: SqliteDb, limit = 20): Session[] {
  const rows = db.db.prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?').all(limit) as Record<string, unknown>[]
  return rows.map(rowToSession)
}

export function insertChange(db: SqliteDb, change: ChangeSet): void {
  db.db.prepare(`
    INSERT INTO changes (id, session_id, agent, risk_level, status, files, deps_added, deps_invalid,
      control_violations, detected_at, decision_at, commit_hash, rejected_branch, decision_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    change.id,
    change.sessionId,
    change.agent,
    change.riskLevel,
    change.status,
    JSON.stringify(change.files),
    JSON.stringify(change.depsAdded),
    JSON.stringify(change.depsInvalid),
    JSON.stringify(change.controlViolations),
    change.detectedAt,
    change.decisionAt ?? null,
    change.commitHash ?? null,
    change.rejectedBranch ?? null,
    change.decisionMessage ?? null,
  )
}

export function updateChangeStatus(
  db: SqliteDb,
  changeId: string,
  status: string,
  commitHash?: string,
  rejectedBranch?: string,
  decisionMessage?: string,
): void {
  db.db.prepare(`
    UPDATE changes SET status = ?, decision_at = ?, commit_hash = ?, rejected_branch = ?, decision_message = ?
    WHERE id = ?
  `).run(
    status,
    new Date().toISOString(),
    commitHash ?? null,
    rejectedBranch ?? null,
    decisionMessage ?? null,
    changeId,
  )
}

function rowToChange(row: Record<string, unknown>): ChangeSet {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    agent: row.agent as string,
    riskLevel: row.risk_level as ChangeSet['riskLevel'],
    status: row.status as ChangeSet['status'],
    files: JSON.parse(row.files as string) as ChangeSet['files'],
    depsAdded: JSON.parse(row.deps_added as string) as string[],
    depsInvalid: JSON.parse(row.deps_invalid as string) as string[],
    controlViolations: JSON.parse(row.control_violations as string) as ChangeSet['controlViolations'],
    detectedAt: row.detected_at as string,
    decisionAt: row.decision_at as string | undefined ?? undefined,
    commitHash: row.commit_hash as string | undefined ?? undefined,
    rejectedBranch: row.rejected_branch as string | undefined ?? undefined,
    decisionMessage: row.decision_message as string | undefined ?? undefined,
  }
}

export function getChangesForSession(db: SqliteDb, sessionId: string): ChangeSet[] {
  const rows = db.db.prepare('SELECT * FROM changes WHERE session_id = ?').all(sessionId) as Record<string, unknown>[]
  return rows.map(rowToChange)
}

export function getChange(db: SqliteDb, changeId: string): ChangeSet | null {
  const row = db.db.prepare('SELECT * FROM changes WHERE id = ?').get(changeId) as Record<string, unknown> | undefined
  return row ? rowToChange(row) : null
}

export function insertSessionRequest(db: SqliteDb, request: SessionRequest): void {
  db.db.prepare(`
    INSERT INTO session_requests (session_id, request_text, source, created_at)
    VALUES (?, ?, ?, ?)
  `).run(
    request.sessionId,
    request.requestText,
    request.source,
    new Date().toISOString(),
  )
}

export function listSessionRequests(db: SqliteDb, sessionId: string): SessionRequest[] {
  const rows = db.db.prepare('SELECT * FROM session_requests WHERE session_id = ?').all(sessionId) as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as number,
    sessionId: row.session_id as string,
    requestText: row.request_text as string,
    source: row.source as SessionRequest['source'],
    createdAt: row.created_at as string,
  }))
}

export function insertChecklistItems(db: SqliteDb, items: SessionChecklistItem[]): void {
  const stmt = db.db.prepare(`
    INSERT INTO checklist (session_id, item_text, acceptance_criteria, status, evidence, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()
  for (const item of items) {
    stmt.run(
      item.sessionId,
      item.itemText,
      item.acceptanceCriteria,
      item.status,
      item.evidence ?? null,
      item.notes ?? null,
      now,
      now,
    )
  }
}

export function listChecklistItems(db: SqliteDb, sessionId: string): SessionChecklistItem[] {
  const rows = db.db.prepare('SELECT * FROM checklist WHERE session_id = ?').all(sessionId) as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as number,
    sessionId: row.session_id as string,
    itemText: row.item_text as string,
    acceptanceCriteria: row.acceptance_criteria as string,
    status: row.status as SessionChecklistItem['status'],
    evidence: row.evidence as string | undefined ?? undefined,
    notes: row.notes as string | undefined ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }))
}

export function updateChecklistItem(
  db: SqliteDb,
  id: number,
  status: SessionChecklistItem['status'],
  evidence?: string,
  notes?: string,
): void {
  db.db.prepare(`
    UPDATE checklist SET status = ?, evidence = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    status,
    evidence ?? null,
    notes ?? null,
    new Date().toISOString(),
    id,
  )
}

export function upsertMemoryEntry(db: SqliteDb, entry: MemoryEntry): void {
  db.db.prepare(`
    INSERT INTO memory_entries (key, content, source, is_obsolete, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      content = excluded.content,
      source = excluded.source,
      is_obsolete = excluded.is_obsolete,
      updated_at = excluded.updated_at
  `).run(
    entry.key,
    entry.content,
    entry.source,
    entry.isObsolete ? 1 : 0,
    new Date().toISOString(),
  )
}

export function listMemoryEntries(db: SqliteDb): MemoryEntry[] {
  const rows = db.db.prepare('SELECT * FROM memory_entries').all() as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as number,
    key: row.key as string,
    content: row.content as string,
    source: row.source as string,
    isObsolete: row.is_obsolete === 1,
    updatedAt: row.updated_at as string,
  }))
}

export function upsertDailyLog(db: SqliteDb, log: DailyLog): void {
  db.db.prepare(`
    INSERT INTO daily_logs (log_date, summary, completed_count, pending_count, blocked_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(log_date) DO UPDATE SET
      summary = excluded.summary,
      completed_count = excluded.completed_count,
      pending_count = excluded.pending_count,
      blocked_count = excluded.blocked_count,
      updated_at = excluded.updated_at
  `).run(
    log.logDate,
    log.summary,
    log.completedCount,
    log.pendingCount,
    log.blockedCount,
    new Date().toISOString(),
  )
}

export function insertApproval(db: SqliteDb, approval: ApprovalRecord): ApprovalRecord {
  const now = new Date().toISOString()
  const result = db.db.prepare(`
    INSERT INTO approvals (session_id, approval_type, target, scope, reason, created_by, created_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approval.sessionId,
    approval.approvalType,
    approval.target,
    approval.scope,
    approval.reason,
    approval.createdBy,
    now,
    approval.revokedAt ?? null,
  )
  return { ...approval, id: result.lastInsertRowid as number, createdAt: now }
}

export function listApprovals(db: SqliteDb, sessionId?: string, activeOnly = true): ApprovalRecord[] {
  let query = 'SELECT * FROM approvals WHERE 1=1'
  const params: unknown[] = []

  if (sessionId) {
    query += ' AND session_id = ?'
    params.push(sessionId)
  }
  if (activeOnly) {
    query += ' AND revoked_at IS NULL'
  }

  const rows = db.db.prepare(query).all(...params) as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as number,
    sessionId: row.session_id as string,
    approvalType: row.approval_type as ApprovalRecord['approvalType'],
    target: row.target as string,
    scope: row.scope as ApprovalRecord['scope'],
    reason: row.reason as string,
    createdBy: row.created_by as ApprovalRecord['createdBy'],
    createdAt: row.created_at as string,
    revokedAt: row.revoked_at as string | undefined ?? undefined,
  }))
}

export function revokeApproval(db: SqliteDb, id: number): ApprovalRecord | null {
  const row = db.db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  const revokedAt = new Date().toISOString()
  db.db.prepare('UPDATE approvals SET revoked_at = ? WHERE id = ?').run(revokedAt, id)
  return {
    id: row.id as number,
    sessionId: row.session_id as string,
    approvalType: row.approval_type as ApprovalRecord['approvalType'],
    target: row.target as string,
    scope: row.scope as ApprovalRecord['scope'],
    reason: row.reason as string,
    createdBy: row.created_by as ApprovalRecord['createdBy'],
    createdAt: row.created_at as string,
    revokedAt,
  }
}

export function insertSnapshot(db: SqliteDb, snapshot: SnapshotRecord): SnapshotRecord {
  const now = new Date().toISOString()
  const result = db.db.prepare(`
    INSERT INTO snapshots (session_id, label, source, change_id, manifest_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    snapshot.sessionId,
    snapshot.label,
    snapshot.source,
    snapshot.changeId ?? null,
    snapshot.manifestPath,
    now,
  )
  return { ...snapshot, id: result.lastInsertRowid as number, createdAt: now }
}

export function listSnapshots(db: SqliteDb, sessionId?: string): SnapshotRecord[] {
  const rows = sessionId
    ? db.db.prepare('SELECT * FROM snapshots WHERE session_id = ?').all(sessionId) as Record<string, unknown>[]
    : db.db.prepare('SELECT * FROM snapshots').all() as Record<string, unknown>[]
  return rows.map(row => ({
    id: row.id as number,
    sessionId: row.session_id as string,
    label: row.label as string,
    source: row.source as SnapshotRecord['source'],
    changeId: row.change_id as string | undefined ?? undefined,
    manifestPath: row.manifest_path as string,
    createdAt: row.created_at as string,
  }))
}

export function getSnapshot(db: SqliteDb, id: number): SnapshotRecord | null {
  const row = db.db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return {
    id: row.id as number,
    sessionId: row.session_id as string,
    label: row.label as string,
    source: row.source as SnapshotRecord['source'],
    changeId: row.change_id as string | undefined ?? undefined,
    manifestPath: row.manifest_path as string,
    createdAt: row.created_at as string,
  }
}
