/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { MEMORY_DIR, SESSIONS_DIR, dateFolder } from './paths.js'
import type { DailyLog, Session, SessionChecklistItem } from './types.js'
import type { JsonDb } from './storage.js'
import { upsertDailyLog, upsertMemoryEntry } from './storage.js'

const MEMORY_FILES = [
  'project_summary.md',
  'architecture_summary.md',
  'open_risks.md',
  'active_constraints.md',
  'integration_status.md',
  'brand_and_naming.md',
  'session_digest_latest.md',
  'glossary.md',
]

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function ensureOperationalDirs(projectRoot: string): void {
  ensureDir(resolve(projectRoot, MEMORY_DIR))
  ensureDir(resolve(projectRoot, join(MEMORY_DIR, 'checkpoints')))
  ensureDir(resolve(projectRoot, SESSIONS_DIR))
}

export function refreshSessionDigest(projectRoot: string, session: Session, checklist: SessionChecklistItem[]): string {
  ensureOperationalDirs(projectRoot)
  const completed = checklist.filter(item => item.status === 'completed').length
  const blocked = checklist.filter(item => item.status === 'blocked').length
  const pending = checklist.filter(item => item.status !== 'completed' && item.status !== 'blocked').length
  const content = [
    '# SP-DevControl - Ultimo Digest de Sesion',
    '',
    '## Ultima actualizacion',
    `- Fecha: ${new Date().toISOString()}`,
    `- Sesion: ${session.id}`,
    `- Estado: ${session.status ?? 'active'}`,
    '',
    '## Resumen',
    `- Objetivo: ${session.objective ?? 'sin objetivo definido'}`,
    `- Checklist completado: ${completed}`,
    `- Checklist pendiente: ${pending}`,
    `- Checklist bloqueado: ${blocked}`,
    `- Tokens estimados: ${session.tokenEstimate ?? 0}/${session.tokenBudget ?? 0}`,
  ].join('\n')

  const filepath = resolve(projectRoot, join(MEMORY_DIR, 'session_digest_latest.md'))
  writeFileSync(filepath, content, 'utf-8')
  return filepath
}

export function refreshMemoryIndex(projectRoot: string, database: JsonDb): void {
  ensureOperationalDirs(projectRoot)
  for (const file of MEMORY_FILES) {
    const filepath = resolve(projectRoot, join(MEMORY_DIR, file))
    if (!existsSync(filepath)) continue
    upsertMemoryEntry(database, {
      key: file,
      content: readFileSync(filepath, 'utf-8'),
      source: filepath,
      isObsolete: false,
    })
  }
}

export function refreshDailySummary(projectRoot: string, database: JsonDb, date: Date = new Date()): string {
  ensureOperationalDirs(projectRoot)
  const folder = resolve(projectRoot, join(SESSIONS_DIR, dateFolder(date)))
  const files = existsSync(folder) ? readdirSync(folder).filter(name => name.endsWith('-checklist.md')) : []

  let completed = 0
  let pending = 0
  let blocked = 0
  for (const file of files) {
    const content = readFileSync(join(folder, file), 'utf-8')
    completed += (content.match(/\|\s*completed\s*\|/g) ?? []).length
    blocked += (content.match(/\|\s*blocked\s*\|/g) ?? []).length
    pending += (content.match(/\|\s*(pending|in_progress)\s*\|/g) ?? []).length
  }

  const summary = [
    '# Resumen Diario de Sesiones',
    '',
    '## Fecha',
    `- ${dateFolder(date)}`,
    '',
    '## Totales',
    `- completed: ${completed}`,
    `- pending: ${pending}`,
    `- blocked: ${blocked}`,
  ].join('\n')

  const filepath = resolve(projectRoot, join(SESSIONS_DIR, 'daily-summary.md'))
  writeFileSync(filepath, summary, 'utf-8')

  const log: DailyLog = {
    logDate: dateFolder(date),
    summary,
    completedCount: completed,
    pendingCount: pending,
    blockedCount: blocked,
  }
  upsertDailyLog(database, log)
  return filepath
}
