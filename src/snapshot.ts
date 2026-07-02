/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { dirname, join, resolve } from 'path'
import { CONTROL_DIR } from './paths.js'
import { getChangesForSession, insertSnapshot, type JsonDb } from './storage.js'
import type { ChangeSet, Session, SnapshotRecord } from './types.js'

interface SnapshotManifest {
  sessionId: string
  label: string
  source: SnapshotRecord['source']
  changeId?: string
  createdAt: string
  files: Array<{
    filepath: string
    content: string
  }>
}

function snapshotsDir(projectRoot: string): string {
  const dir = resolve(projectRoot, CONTROL_DIR, 'snapshots')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function safeLabel(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'snapshot'
}

function currentFileContent(projectRoot: string, filepath: string): string {
  const absolute = resolve(projectRoot, filepath)
  if (!existsSync(absolute)) return ''
  return readFileSync(absolute, 'utf-8')
}

function writeFileState(projectRoot: string, filepath: string, content: string): void {
  const absolute = resolve(projectRoot, filepath)
  const root = resolve(projectRoot)
  if (!absolute.startsWith(root + '/') && absolute !== root) {
    throw new Error(`Path traversal blocked: ${filepath} resolves outside project root`)
  }
  if (content === '') {
    if (existsSync(absolute)) rmSync(absolute, { force: true })
    return
  }
  const dir = dirname(absolute)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(absolute, content, 'utf-8')
}

export function createSnapshotFromCurrentState(
  projectRoot: string,
  database: JsonDb,
  session: Session,
  label: string,
  filepaths: string[],
  source: SnapshotRecord['source'] = 'manual',
  changeId?: string,
): SnapshotRecord {
  const uniqueFiles = [...new Set(filepaths)].sort()
  const manifest: SnapshotManifest = {
    sessionId: session.id,
    label,
    source,
    changeId,
    createdAt: new Date().toISOString(),
    files: uniqueFiles.map(filepath => ({
      filepath,
      content: currentFileContent(projectRoot, filepath),
    })),
  }

  const filename = `${session.id}-${safeLabel(label)}-${Date.now()}.json`
  const manifestPath = join(snapshotsDir(projectRoot), filename)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  return insertSnapshot(database, {
    sessionId: session.id,
    label,
    source,
    changeId,
    manifestPath,
  })
}

export function createSnapshotFromChangeBefore(
  projectRoot: string,
  database: JsonDb,
  session: Session,
  change: ChangeSet,
  label: string,
  source: SnapshotRecord['source'] = 'pre_approval',
): SnapshotRecord {
  const manifest: SnapshotManifest = {
    sessionId: session.id,
    label,
    source,
    changeId: change.id,
    createdAt: new Date().toISOString(),
    files: change.files.map(file => ({
      filepath: file.filepath,
      content: file.snapshotBefore,
    })),
  }

  const filename = `${session.id}-${safeLabel(label)}-${Date.now()}.json`
  const manifestPath = join(snapshotsDir(projectRoot), filename)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

  return insertSnapshot(database, {
    sessionId: session.id,
    label,
    source,
    changeId: change.id,
    manifestPath,
  })
}

function fileChecksum(filepath: string): string {
  if (!existsSync(filepath)) return 'DELETED'
  return createHash('sha256').update(readFileSync(filepath, 'utf-8')).digest('hex').slice(0, 16)
}

export interface RollbackVerification {
  filepath: string
  expectedChecksum: string
  actualChecksum: string
  match: boolean
}

export function rollbackChange(projectRoot: string, change: ChangeSet): { restoredFiles: string[]; verification: RollbackVerification[] } {
  const verification: RollbackVerification[] = []
  for (const file of change.files) {
    writeFileState(projectRoot, file.filepath, file.snapshotBefore)
    const expected = createHash('sha256').update(file.snapshotBefore).digest('hex').slice(0, 16)
    const actual = fileChecksum(resolve(projectRoot, file.filepath))
    verification.push({
      filepath: file.filepath,
      expectedChecksum: expected,
      actualChecksum: actual,
      match: expected === actual,
    })
  }
  const mismatches = verification.filter(v => !v.match)
  if (mismatches.length > 0) {
    const reportDir = resolve(projectRoot, CONTROL_DIR, 'reports')
    if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
    const reportPath = join(reportDir, `rollback-verify-${change.id}-${Date.now()}.json`)
    writeFileSync(reportPath, JSON.stringify({ changeId: change.id, mismatches }, null, 2), 'utf-8')
  }
  return { restoredFiles: change.files.map(file => file.filepath), verification }
}

export function rollbackSession(projectRoot: string, changes: ChangeSet[]): { restoredFiles: string[]; verification: RollbackVerification[] } {
  const earliest = new Map<string, string>()
  for (const change of changes) {
    for (const file of change.files) {
      if (!earliest.has(file.filepath)) {
        earliest.set(file.filepath, file.snapshotBefore)
      }
    }
  }

  const verification: RollbackVerification[] = []
  for (const [filepath, content] of earliest.entries()) {
    writeFileState(projectRoot, filepath, content)
    const expected = createHash('sha256').update(content).digest('hex').slice(0, 16)
    const actual = fileChecksum(resolve(projectRoot, filepath))
    verification.push({
      filepath,
      expectedChecksum: expected,
      actualChecksum: actual,
      match: expected === actual,
    })
  }

  const mismatches = verification.filter(v => !v.match)
  if (mismatches.length > 0) {
    const reportDir = resolve(projectRoot, CONTROL_DIR, 'reports')
    if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
    const reportPath = join(reportDir, `rollback-verify-session-${changes[0]?.sessionId ?? 'unknown'}-${Date.now()}.json`)
    writeFileSync(reportPath, JSON.stringify({ sessionId: changes[0]?.sessionId, mismatches }, null, 2), 'utf-8')
  }

  return { restoredFiles: [...earliest.keys()], verification }
}

export function snapshotCandidateFilesForSession(database: JsonDb, sessionId: string): string[] {
  const changes = getChangesForSession(database, sessionId)
  return [...new Set(changes.flatMap(change => change.files.map(file => file.filepath)))].sort()
}
