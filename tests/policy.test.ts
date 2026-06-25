import { mkdtempSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { DB_PATH } from '../src/paths.js'
import {
  closeDb,
  getDb,
  insertApproval,
  listApprovals,
  revokeApproval,
} from '../src/storage.js'
import { initializeControlledProject } from '../src/project_init.js'
import {
  addProtectedPath,
  approveCommand,
  evaluateCommandRisk,
  evaluatePathRisk,
  loadPolicy,
  removeProtectedPath,
  revokeCommand,
} from '../src/policy.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-test-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

describe('project init', () => {
  it('creates docs, baseline and policy', () => {
    const dir = tempProject()
    const summary = initializeControlledProject(dir, { project: 'test-project' })
    expect(summary.gitPresent).toBe(true)
    expect(summary.createdDocs.length).toBeGreaterThan(0)
    expect(loadPolicy(dir).protectedPaths.length).toBeGreaterThan(0)
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('policy engine', () => {
  it('detects protected auth paths as high risk', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const result = evaluatePathRisk(dir, 'src/auth/login.ts')
    expect(result.protected).toBe(true)
    expect(result.risk).toBe('HIGH')
    expect(result.approved).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('blocks destructive commands and can approve explicit ones', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const blocked = evaluateCommandRisk(dir, 'git reset --hard')
    expect(blocked.decision).toBe('BLOCK')
    approveCommand(dir, 'custom deploy local')
    const approved = evaluateCommandRisk(dir, 'custom deploy local --dry-run')
    expect(approved.decision).toBe('ALLOW')
    expect(approved.approvalSource).toBe('global')
    rmSync(dir, { recursive: true, force: true })
  })

  it('allows adding and removing a protected path pattern', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    addProtectedPath(dir, 'src/core/**')
    expect(evaluatePathRisk(dir, 'src/core/engine.ts').protected).toBe(true)
    removeProtectedPath(dir, 'src/core/**')
    expect(evaluatePathRisk(dir, 'src/core/engine.ts').protected).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('allows approving and revoking a global command pattern', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    approveCommand(dir, 'npm install')
    expect(evaluateCommandRisk(dir, 'npm install axios').decision).toBe('ALLOW')
    revokeCommand(dir, 'npm install')
    expect(evaluateCommandRisk(dir, 'npm install axios').decision).toBe('REVIEW')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('session approvals', () => {
  it('stores session approvals and lets them override blocked commands until revoked', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const db = getDb(resolve(dir, DB_PATH))
    const approval = insertApproval(db, {
      sessionId: 'session-1',
      approvalType: 'command',
      target: 'git reset --hard',
      scope: 'session',
      reason: 'rollback controlado',
      createdBy: 'user',
    })

    const active = listApprovals(db, 'session-1')
    const allowed = evaluateCommandRisk(dir, 'git reset --hard', active)
    expect(allowed.decision).toBe('ALLOW')
    expect(allowed.approvalSource).toBe('session')

    revokeApproval(db, approval.id!)
    const revoked = listApprovals(db, 'session-1')
    const blocked = evaluateCommandRisk(dir, 'git reset --hard', revoked)
    expect(blocked.decision).toBe('BLOCK')

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('marks protected paths as approved when a session path approval exists', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const db = getDb(resolve(dir, DB_PATH))
    insertApproval(db, {
      sessionId: 'session-2',
      approvalType: 'path',
      target: 'src/auth/**',
      scope: 'session',
      reason: 'hotfix autorizado',
      createdBy: 'user',
    })

    const active = listApprovals(db, 'session-2')
    const result = evaluatePathRisk(dir, 'src/auth/login.ts', active)
    expect(result.protected).toBe(true)
    expect(result.approved).toBe(true)

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
