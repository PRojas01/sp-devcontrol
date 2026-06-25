import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'
import { processChangeBurst } from '../src/monitor.js'
import { DB_PATH } from '../src/paths.js'
import { initializeControlledProject } from '../src/project_init.js'
import { createSession } from '../src/session.js'
import {
  createSnapshotFromCurrentState,
  rollbackChange,
  rollbackSession,
  snapshotCandidateFilesForSession,
} from '../src/snapshot.js'
import { getChangesForSession, getDb, insertSession, listSnapshots, closeDb } from '../src/storage.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-snapshot-test-'))
  mkdirSync(join(dir, '.git'))
  mkdirSync(join(dir, 'src'), { recursive: true })
  return dir
}

describe('snapshot and rollback', () => {
  it('creates a manual snapshot and rolls back a single change', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const config = loadConfig(dir)
    const db = getDb(resolve(dir, DB_PATH))
    const session = createSession('ds-20260613-888', 'test-project', 'claude-code', 'watch')
    insertSession(db, session)

    const target = resolve(dir, 'src/example.ts')
    writeFileSync(target, 'export const value = 1\n', 'utf-8')

    const changeResult = processChangeBurst(dir, db, session, [{
      filepath: 'src/example.ts',
      eventType: 'modified',
      linesAdded: 1,
      linesRemoved: 1,
      outOfScope: false,
      diffContent: '--- a/src/example.ts\n+++ b/src/example.ts\n-export const value = 1\n+export const value = 2\n',
      snapshotBefore: 'export const value = 1\n',
      snapshotAfter: 'export const value = 2\n',
    }], config)

    writeFileSync(target, 'export const value = 2\n', 'utf-8')
    const snapshot = createSnapshotFromCurrentState(dir, db, session, 'manual-check', ['src/example.ts'])
    expect(existsSync(snapshot.manifestPath)).toBe(true)
    expect(listSnapshots(db, session.id)).toHaveLength(1)

    rollbackChange(dir, changeResult.change)
    expect(readFileSync(target, 'utf-8')).toBe('export const value = 1\n')

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('rolls back a session to earliest before-state across multiple changes', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const config = loadConfig(dir)
    const db = getDb(resolve(dir, DB_PATH))
    const session = createSession('ds-20260613-889', 'test-project', 'claude-code', 'watch')
    insertSession(db, session)

    const target = resolve(dir, 'src/example.ts')
    writeFileSync(target, 'export const value = 1\n', 'utf-8')

    processChangeBurst(dir, db, session, [{
      filepath: 'src/example.ts',
      eventType: 'modified',
      linesAdded: 1,
      linesRemoved: 1,
      outOfScope: false,
      diffContent: '',
      snapshotBefore: 'export const value = 1\n',
      snapshotAfter: 'export const value = 2\n',
    }], config)
    writeFileSync(target, 'export const value = 2\n', 'utf-8')

    processChangeBurst(dir, db, session, [{
      filepath: 'src/example.ts',
      eventType: 'modified',
      linesAdded: 1,
      linesRemoved: 1,
      outOfScope: false,
      diffContent: '',
      snapshotBefore: 'export const value = 2\n',
      snapshotAfter: 'export const value = 3\n',
    }], config)
    writeFileSync(target, 'export const value = 3\n', 'utf-8')

    expect(snapshotCandidateFilesForSession(db, session.id)).toEqual(['src/example.ts'])
    const restored = rollbackSession(dir, getChangesForSession(db, session.id))
    expect(restored).toEqual(['src/example.ts'])
    expect(readFileSync(target, 'utf-8')).toBe('export const value = 1\n')

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
