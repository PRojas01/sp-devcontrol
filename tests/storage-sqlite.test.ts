import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  closeDb,
  getDb,
  insertSession,
  getSession,
  listSessions,
  insertChange,
  getChange,
  insertApproval,
  listApprovals,
} from '../src/storage-sqlite.js'
import type { Session, ChangeSet, ApprovalRecord } from '../src/types.js'

let tmpDir: string
let dbPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'devcontrol-sqlite-test-'))
  dbPath = join(tmpDir, 'devcontrol.db.json')
})

afterEach(() => {
  closeDb()
  rmSync(tmpDir, { recursive: true, force: true })
})

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSession(id = 'sess-001'): Session {
  return {
    id,
    project: 'test-project',
    agent: 'claude-code',
    mode: 'watch',
    startedAt: new Date().toISOString(),
    totalChanges: 0,
    approved: 0,
    rejected: 0,
    status: 'active',
  }
}

function makeChange(id = 'chg-001', sessionId = 'sess-001'): ChangeSet {
  return {
    id,
    sessionId,
    agent: 'claude-code',
    riskLevel: 'LOW',
    status: 'pending',
    files: [
      {
        filepath: 'src/foo.ts',
        eventType: 'modified',
        linesAdded: 5,
        linesRemoved: 2,
      },
    ],
    depsAdded: [],
    depsInvalid: [],
    controlViolations: [],
    detectedAt: new Date().toISOString(),
  }
}

function makeApproval(sessionId = 'sess-001'): ApprovalRecord {
  return {
    sessionId,
    approvalType: 'command',
    target: 'npm test',
    scope: 'session',
    reason: 'approved for testing',
    createdBy: 'user',
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('storage-sqlite', () => {
  it('getDb creates a .sqlite file and returns an object with .db', () => {
    const sqliteDb = getDb(dbPath)
    expect(sqliteDb).toBeDefined()
    expect(sqliteDb.db).toBeDefined()
    // path should point to .sqlite (not .json)
    expect(sqliteDb.path).toMatch(/\.sqlite$/)
    expect(existsSync(sqliteDb.path)).toBe(true)
  })

  it('insertSession + getSession round-trip', () => {
    const db = getDb(dbPath)
    const session = makeSession('sess-rtrip')
    insertSession(db, session)
    const fetched = getSession(db, 'sess-rtrip')
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe(session.id)
    expect(fetched!.project).toBe(session.project)
    expect(fetched!.agent).toBe(session.agent)
    expect(fetched!.mode).toBe(session.mode)
    expect(fetched!.status).toBe(session.status)
    expect(fetched!.totalChanges).toBe(0)
  })

  it('insertSession + listSessions returns the session', () => {
    const db = getDb(dbPath)
    const session = makeSession('sess-list')
    insertSession(db, session)
    const sessions = listSessions(db)
    expect(sessions.length).toBeGreaterThanOrEqual(1)
    const found = sessions.find(s => s.id === 'sess-list')
    expect(found).toBeDefined()
    expect(found!.project).toBe('test-project')
  })

  it('insertChange + getChange round-trip', () => {
    const db = getDb(dbPath)
    // session must exist for FK-less insert to be valid (no FK enforced in this schema)
    insertSession(db, makeSession('sess-for-chg'))
    const change = makeChange('chg-rtrip', 'sess-for-chg')
    insertChange(db, change)
    const fetched = getChange(db, 'chg-rtrip')
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe('chg-rtrip')
    expect(fetched!.sessionId).toBe('sess-for-chg')
    expect(fetched!.riskLevel).toBe('LOW')
    expect(fetched!.status).toBe('pending')
    expect(fetched!.files).toHaveLength(1)
    expect(fetched!.files[0].filepath).toBe('src/foo.ts')
  })

  it('insertApproval + listApprovals returns the approval', () => {
    const db = getDb(dbPath)
    const approval = makeApproval('sess-appr')
    const inserted = insertApproval(db, approval)
    expect(inserted.id).toBeDefined()
    const approvals = listApprovals(db, 'sess-appr')
    expect(approvals.length).toBeGreaterThanOrEqual(1)
    const found = approvals.find(a => a.target === 'npm test')
    expect(found).toBeDefined()
    expect(found!.approvalType).toBe('command')
    expect(found!.scope).toBe('session')
    expect(found!.createdBy).toBe('user')
  })

  it('closeDb closes without error', () => {
    getDb(dbPath) // ensure it is open
    expect(() => closeDb()).not.toThrow()
    // calling again should also be safe
    expect(() => closeDb()).not.toThrow()
  })
})
