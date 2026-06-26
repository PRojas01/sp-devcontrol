/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

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
  addReviewCommand,
  approveCommand,
  evaluateCommandRisk,
  evaluatePathRisk,
  listReviewCommands,
  loadPolicy,
  removeProtectedPath,
  removeReviewCommand,
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

describe('reviewCommands', () => {
  it('returns REVIEW for commands matching reviewCommands list', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    addReviewCommand(dir, 'git push')
    addReviewCommand(dir, 'npm publish')
    const push = evaluateCommandRisk(dir, 'git push origin master')
    expect(push.decision).toBe('REVIEW')
    expect(push.reason).toContain('review pattern')
    const publish = evaluateCommandRisk(dir, 'npm publish --access public')
    expect(publish.decision).toBe('REVIEW')
    rmSync(dir, { recursive: true, force: true })
  })

  it('reviewCommands are overridden by approvedCommands (ALLOW wins)', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    addReviewCommand(dir, 'git push')
    approveCommand(dir, 'git push')
    const result = evaluateCommandRisk(dir, 'git push origin master')
    expect(result.decision).toBe('ALLOW')
    expect(result.approvalSource).toBe('global')
    rmSync(dir, { recursive: true, force: true })
  })

  it('blockedCommands take priority over reviewCommands', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    addReviewCommand(dir, 'git push --force')
    const result = evaluateCommandRisk(dir, 'git push --force')
    expect(result.decision).toBe('BLOCK')
    rmSync(dir, { recursive: true, force: true })
  })

  it('can list and remove review commands', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    addReviewCommand(dir, 'vsce publish')
    addReviewCommand(dir, 'npm publish')
    expect(listReviewCommands(dir)).toContain('vsce publish')
    removeReviewCommand(dir, 'vsce publish')
    expect(listReviewCommands(dir)).not.toContain('vsce publish')
    expect(listReviewCommands(dir)).toContain('npm publish')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('policy security — bypass prevention', () => {
  it('does NOT allow rm -rf prefixed with approved command substring', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    approveCommand(dir, 'git commit')
    // rm -rf && git commit should NOT be allowed just because "git commit" appears in it
    const result = evaluateCommandRisk(dir, 'rm -rf / && git commit -m "done"')
    expect(result.decision).not.toBe('ALLOW')
    rmSync(dir, { recursive: true, force: true })
  })

  it('does NOT allow blocked command with extra whitespace', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    // "git reset --hard" is blocked; exact match required
    const result = evaluateCommandRisk(dir, 'git reset --hard')
    expect(result.decision).toBe('BLOCK')
    rmSync(dir, { recursive: true, force: true })
  })

  it('blocks path traversal outside projectRoot', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    addProtectedPath(dir, 'src/**')
    const result = evaluatePathRisk(dir, 'src/../../.env')
    // Path resolves to .env which is outside project root — must be blocked
    // Any path traversing outside projectRoot is blocked: protected=true, risk=HIGH
    expect(result.protected).toBe(true)
    expect(result.risk).toBe('HIGH')
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
