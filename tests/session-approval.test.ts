/**
 * SP-DevControl v2.0.0
 * Session approval token tests
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HUMAN_APPROVAL_TOKEN_ENV } from '../src/human-approval.js'
import { closeDb, getDb, insertSession, listApprovals } from '../src/storage.js'
import { grantSessionApproval } from '../src/session-approval.js'
import type { Session } from '../src/types.js'

let tmpDir: string
let previousHumanApprovalToken: string | undefined

function makeSession(id = 'session-approval-test'): Session {
  return {
    id,
    project: 'test-project',
    agent: 'codex',
    mode: 'watch',
    startedAt: new Date().toISOString(),
    totalChanges: 0,
    approved: 0,
    rejected: 0,
    status: 'active',
  }
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'devcontrol-session-approval-test-'))
  previousHumanApprovalToken = process.env[HUMAN_APPROVAL_TOKEN_ENV]
  process.env[HUMAN_APPROVAL_TOKEN_ENV] = 'human-secret'
})

afterEach(() => {
  closeDb()
  if (previousHumanApprovalToken === undefined) {
    delete process.env[HUMAN_APPROVAL_TOKEN_ENV]
  } else {
    process.env[HUMAN_APPROVAL_TOKEN_ENV] = previousHumanApprovalToken
  }
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('grantSessionApproval', () => {
  it('rejects session approval grants without a valid human token', () => {
    const db = getDb(join(tmpDir, 'devcontrol.db.json'))
    insertSession(db, makeSession())

    expect(() => grantSessionApproval(db, {
      sessionId: 'session-approval-test',
      approvalType: 'command',
      target: 'git reset --hard',
      reason: 'rollback controlado',
    })).toThrow(/token is required/i)

    expect(listApprovals(db, 'session-approval-test')).toHaveLength(0)
  })

  it('stores a session approval grant when the human token is valid', () => {
    const db = getDb(join(tmpDir, 'devcontrol.db.json'))
    insertSession(db, makeSession())

    const approval = grantSessionApproval(db, {
      sessionId: 'session-approval-test',
      approvalType: 'command',
      target: 'npm test',
      reason: 'validado por humano',
      humanApprovalToken: 'human-secret',
    })

    expect(approval.id).toBeDefined()
    expect(approval.approvalType).toBe('command')
    expect(listApprovals(db, 'session-approval-test')).toHaveLength(1)
  })
})
