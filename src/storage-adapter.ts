/**
 * storage-adapter.ts
 * Selects the active storage backend (json | sqlite) based on project config
 * and re-exports all storage functions delegating to the chosen backend.
 *
 * Uses module-level activeBackend so config is only read once per process.
 * Top-level await (valid in ESNext/ES2022 ESM) handles the async import while
 * keeping all exported function signatures synchronous.
 */

import { loadConfig, hasConfig } from './config.js'
import * as jsonStorage from './storage.js'

// Re-export types so consumers can import them from this adapter directly
export type { JsonDbState } from './storage.js'
export { JsonDb } from './storage.js'

type StorageBackend = 'json' | 'sqlite'
type StorageModule = typeof jsonStorage

function resolveBackend(projectRoot?: string): StorageBackend {
  if (!hasConfig(projectRoot)) return 'json'
  const cfg = loadConfig(projectRoot)
  return (cfg as unknown as { storageBackend?: string }).storageBackend === 'sqlite'
    ? 'sqlite'
    : 'json'
}

// Determined once at module-load time; never re-read per call.
const activeBackend: StorageBackend = resolveBackend()

// Dynamic import with a variable path so TypeScript does not attempt to
// statically resolve ./storage-sqlite.js (which may not exist yet).
let _mod: StorageModule

if (activeBackend === 'sqlite') {
  const sqlitePath = './storage-sqlite.js'
  _mod = (await import(sqlitePath)) as StorageModule
} else {
  _mod = jsonStorage
}

// ---------------------------------------------------------------------------
// Delegating exports — same signatures as storage.ts / storage-sqlite.ts
// ---------------------------------------------------------------------------

export function getDb(dbPath: string): ReturnType<StorageModule['getDb']> {
  return _mod.getDb(dbPath)
}

export function closeDb(): void {
  _mod.closeDb()
}

export function insertSession(
  ...args: Parameters<StorageModule['insertSession']>
): ReturnType<StorageModule['insertSession']> {
  return _mod.insertSession(...args)
}

export function updateSession(
  ...args: Parameters<StorageModule['updateSession']>
): ReturnType<StorageModule['updateSession']> {
  return _mod.updateSession(...args)
}

export function getSession(
  ...args: Parameters<StorageModule['getSession']>
): ReturnType<StorageModule['getSession']> {
  return _mod.getSession(...args)
}

export function listSessions(
  ...args: Parameters<StorageModule['listSessions']>
): ReturnType<StorageModule['listSessions']> {
  return _mod.listSessions(...args)
}

export function insertChange(
  ...args: Parameters<StorageModule['insertChange']>
): ReturnType<StorageModule['insertChange']> {
  return _mod.insertChange(...args)
}

export function updateChangeStatus(
  ...args: Parameters<StorageModule['updateChangeStatus']>
): ReturnType<StorageModule['updateChangeStatus']> {
  return _mod.updateChangeStatus(...args)
}

export function getChangesForSession(
  ...args: Parameters<StorageModule['getChangesForSession']>
): ReturnType<StorageModule['getChangesForSession']> {
  return _mod.getChangesForSession(...args)
}

export function getChange(
  ...args: Parameters<StorageModule['getChange']>
): ReturnType<StorageModule['getChange']> {
  return _mod.getChange(...args)
}

export function insertSessionRequest(
  ...args: Parameters<StorageModule['insertSessionRequest']>
): ReturnType<StorageModule['insertSessionRequest']> {
  return _mod.insertSessionRequest(...args)
}

export function listSessionRequests(
  ...args: Parameters<StorageModule['listSessionRequests']>
): ReturnType<StorageModule['listSessionRequests']> {
  return _mod.listSessionRequests(...args)
}

export function insertChecklistItems(
  ...args: Parameters<StorageModule['insertChecklistItems']>
): ReturnType<StorageModule['insertChecklistItems']> {
  return _mod.insertChecklistItems(...args)
}

export function listChecklistItems(
  ...args: Parameters<StorageModule['listChecklistItems']>
): ReturnType<StorageModule['listChecklistItems']> {
  return _mod.listChecklistItems(...args)
}

export function updateChecklistItem(
  ...args: Parameters<StorageModule['updateChecklistItem']>
): ReturnType<StorageModule['updateChecklistItem']> {
  return _mod.updateChecklistItem(...args)
}

export function upsertMemoryEntry(
  ...args: Parameters<StorageModule['upsertMemoryEntry']>
): ReturnType<StorageModule['upsertMemoryEntry']> {
  return _mod.upsertMemoryEntry(...args)
}

export function listMemoryEntries(
  ...args: Parameters<StorageModule['listMemoryEntries']>
): ReturnType<StorageModule['listMemoryEntries']> {
  return _mod.listMemoryEntries(...args)
}

export function upsertDailyLog(
  ...args: Parameters<StorageModule['upsertDailyLog']>
): ReturnType<StorageModule['upsertDailyLog']> {
  return _mod.upsertDailyLog(...args)
}

export function insertApproval(
  ...args: Parameters<StorageModule['insertApproval']>
): ReturnType<StorageModule['insertApproval']> {
  return _mod.insertApproval(...args)
}

export function listApprovals(
  ...args: Parameters<StorageModule['listApprovals']>
): ReturnType<StorageModule['listApprovals']> {
  return _mod.listApprovals(...args)
}

export function revokeApproval(
  ...args: Parameters<StorageModule['revokeApproval']>
): ReturnType<StorageModule['revokeApproval']> {
  return _mod.revokeApproval(...args)
}

export function insertSnapshot(
  ...args: Parameters<StorageModule['insertSnapshot']>
): ReturnType<StorageModule['insertSnapshot']> {
  return _mod.insertSnapshot(...args)
}

export function listSnapshots(
  ...args: Parameters<StorageModule['listSnapshots']>
): ReturnType<StorageModule['listSnapshots']> {
  return _mod.listSnapshots(...args)
}

export function getSnapshot(
  ...args: Parameters<StorageModule['getSnapshot']>
): ReturnType<StorageModule['getSnapshot']> {
  return _mod.getSnapshot(...args)
}
