import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import { processChangeBurst } from '../src/monitor.js'
import { DB_PATH } from '../src/paths.js'
import { initializeControlledProject } from '../src/project_init.js'
import { createSession } from '../src/session.js'
import { getChangesForSession, getDb, insertSession, closeDb } from '../src/storage.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-monitor-test-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

describe('monitor processing', () => {
  it('stores a high-risk change when protected paths are modified without approval', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const config = loadConfig(dir)
    const db = getDb(resolve(dir, DB_PATH))
    const session = createSession('ds-20260613-999', 'test-project', 'claude-code', 'watch')
    insertSession(db, session)

    const result = processChangeBurst(dir, db, session, [{
      filepath: 'src/auth/login.ts',
      eventType: 'modified',
      linesAdded: 12,
      linesRemoved: 3,
      outOfScope: false,
      diffContent: '--- a/src/auth/login.ts\n+++ b/src/auth/login.ts\n+const token = true\n',
      snapshotBefore: 'const token = false\n',
      snapshotAfter: 'const token = true\n',
    }], config)

    expect(result.change.riskLevel).toBe('HIGH')
    expect(result.requiresApproval).toBe(true)
    expect(result.protectedMatches).toContain('src/auth/login.ts')
    expect(result.change.controlViolations.some(item => item.controlId === 'policy-protected-path')).toBe(true)
    expect(getChangesForSession(db, session.id)).toHaveLength(1)
    expect(existsSync(resolve(dir, '.devcontrol', 'reports', `${session.id}-report.md`))).toBe(true)
    const sessionDateFolder = new Date(session.startedAt).toISOString().slice(0, 10)
    expect(readFileSync(resolve(dir, '.devcontrol', 'sessions', sessionDateFolder, `${session.id}-diff-summary.md`), 'utf-8')).toContain(result.change.id)

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
