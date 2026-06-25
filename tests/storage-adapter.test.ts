/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import * as adapter from '../src/storage-adapter.js'
import { JsonDb } from '../src/storage-adapter.js'

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), 'sp-devcontrol-adapter-'))
}

describe('storage-adapter', () => {
  it('initializes with JSON backend by default', () => {
    const dir = tempProject()
    const dbPath = join(dir, 'default.db')
    const db = adapter.getDb(dbPath)
    expect(db).toBeInstanceOf(JsonDb)
    expect(db.path).toMatch(/\.json$/)
    adapter.closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('getDb returns a valid db object with expected shape', () => {
    const dir = tempProject()
    const dbPath = join(dir, 'shape.db')
    const db = adapter.getDb(dbPath)
    expect(db).toHaveProperty('path')
    expect(db).toHaveProperty('state')
    expect(db.state).toHaveProperty('sessions')
    expect(db.state).toHaveProperty('changes')
    expect(db.state).toHaveProperty('sessionRequests')
    expect(db.state).toHaveProperty('counters')
    expect(typeof db.state.counters.request).toBe('number')
    adapter.closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('works with an explicit json config present', () => {
    const dir = tempProject()
    const configDir = join(dir, '.devcontrol')
    mkdirSync(configDir, { recursive: true })
    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify({ storageBackend: 'json' }),
      'utf-8',
    )
    const dbPath = join(dir, 'config.db')
    const db = adapter.getDb(dbPath)
    expect(db).toBeInstanceOf(JsonDb)
    adapter.closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('handles deeply nested missing directory gracefully', () => {
    const dir = tempProject()
    const dbPath = join(dir, 'deeply', 'nested', 'path', 'data.db')
    expect(() => adapter.getDb(dbPath)).not.toThrow()
    const db = adapter.getDb(dbPath)
    expect(db).toBeInstanceOf(JsonDb)
    adapter.closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('stores and retrieves sessions', () => {
    const dir = tempProject()
    const dbPath = join(dir, 'store.db')
    const db = adapter.getDb(dbPath)
    const session = {
      id: 'test-session-1',
      project: 'test-project',
      agent: 'test',
      mode: 'wrap' as const,
      startedAt: new Date().toISOString(),
      status: 'active' as const,
    }
    adapter.insertSession(db, session)
    const retrieved = adapter.getSession(db, 'test-session-1')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe('test-session-1')
    expect(retrieved!.status).toBe('active')
    expect(retrieved!.project).toBe('test-project')
    adapter.closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
