/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

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

describe('rollback edge cases', () => {
  it('rollbackChange with empty snapshotBefore deletes newly-created file', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const target = resolve(dir, 'src/newfile.ts')
    writeFileSync(target, 'export const x = 1\n', 'utf-8')
    expect(existsSync(target)).toBe(true)

    // snapshotBefore = '' means the file did not exist before the change
    rollbackChange(dir, {
      id: 'change-new',
      sessionId: 'session-x',
      agent: 'test-agent',
      files: [{ filepath: 'src/newfile.ts', eventType: 'created', linesAdded: 1, linesRemoved: 0, outOfScope: false, diffContent: '', snapshotBefore: '', snapshotAfter: 'export const x = 1\n' }],
      depsAdded: [],
      depsInvalid: [],
      riskLevel: 'LOW',
      status: 'pending',
      detectedAt: new Date().toISOString(),
      controlViolations: [],
    })
    expect(existsSync(target)).toBe(false)

    rmSync(dir, { recursive: true, force: true })
  })

  it('rollbackChange throws on path traversal outside project root', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })

    expect(() =>
      rollbackChange(dir, {
        id: 'change-traversal',
        sessionId: 'session-x',
        agent: 'test-agent',
        files: [{ filepath: '../../etc/passwd', eventType: 'modified', linesAdded: 0, linesRemoved: 0, outOfScope: false, diffContent: '', snapshotBefore: 'some content', snapshotAfter: '' }],
        depsAdded: [],
        depsInvalid: [],
        riskLevel: 'HIGH',
        status: 'pending',
        detectedAt: new Date().toISOString(),
        controlViolations: [],
      })
    ).toThrow('Path traversal blocked')

    rmSync(dir, { recursive: true, force: true })
  })

  it('rollbackSession with no changes returns empty array and touches no files', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })

    const { restoredFiles } = rollbackSession(dir, [])
    expect(restoredFiles).toEqual([])

    rmSync(dir, { recursive: true, force: true })
  })

  it('rollbackSession partial: only first appearance of each file is restored', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })

    const fileA = resolve(dir, 'src/a.ts')
    const fileB = resolve(dir, 'src/b.ts')
    writeFileSync(fileA, 'v3\n', 'utf-8')
    writeFileSync(fileB, 'b-after\n', 'utf-8')

    const change1 = {
      id: 'c1',
      sessionId: 'session-y',
      agent: 'test-agent',
      files: [{ filepath: 'src/a.ts', eventType: 'modified' as const, linesAdded: 1, linesRemoved: 1, outOfScope: false, diffContent: '', snapshotBefore: 'v1\n', snapshotAfter: 'v2\n' }],
      depsAdded: [] as string[],
      depsInvalid: [] as string[],
      riskLevel: 'LOW' as const,
      status: 'pending' as const,
      detectedAt: new Date().toISOString(),
      controlViolations: [] as never[],
    }
    const change2 = {
      ...change1,
      id: 'c2',
      files: [{ filepath: 'src/a.ts', eventType: 'modified' as const, linesAdded: 1, linesRemoved: 1, outOfScope: false, diffContent: '', snapshotBefore: 'v2\n', snapshotAfter: 'v3\n' }],
    }
    const change3 = {
      ...change1,
      id: 'c3',
      files: [{ filepath: 'src/b.ts', eventType: 'modified' as const, linesAdded: 1, linesRemoved: 1, outOfScope: false, diffContent: '', snapshotBefore: 'b-before\n', snapshotAfter: 'b-after\n' }],
    }

    const { restoredFiles } = rollbackSession(dir, [change1, change2, change3])
    // rollbackSession uses earliest-seen snapshotBefore per file
    expect(restoredFiles.sort()).toEqual(['src/a.ts', 'src/b.ts'])
    expect(readFileSync(fileA, 'utf-8')).toBe('v1\n')
    expect(readFileSync(fileB, 'utf-8')).toBe('b-before\n')

    rmSync(dir, { recursive: true, force: true })
  })
})

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
    const { restoredFiles } = rollbackSession(dir, getChangesForSession(db, session.id))
    expect(restoredFiles).toEqual(['src/example.ts'])
    expect(readFileSync(target, 'utf-8')).toBe('export const value = 1\n')

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
