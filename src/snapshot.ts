import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
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

export function rollbackChange(projectRoot: string, change: ChangeSet): string[] {
  for (const file of change.files) {
    writeFileState(projectRoot, file.filepath, file.snapshotBefore)
  }
  return change.files.map(file => file.filepath)
}

export function rollbackSession(projectRoot: string, changes: ChangeSet[]): string[] {
  const earliest = new Map<string, string>()
  for (const change of changes) {
    for (const file of change.files) {
      if (!earliest.has(file.filepath)) {
        earliest.set(file.filepath, file.snapshotBefore)
      }
    }
  }

  for (const [filepath, content] of earliest.entries()) {
    writeFileState(projectRoot, filepath, content)
  }
  return [...earliest.keys()]
}

export function snapshotCandidateFilesForSession(database: JsonDb, sessionId: string): string[] {
  const changes = getChangesForSession(database, sessionId)
  return [...new Set(changes.flatMap(change => change.files.map(file => file.filepath)))].sort()
}
