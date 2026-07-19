/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import http from 'http'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiServer } from '../src/api.js'
import { closeDb, getDb, getChange, insertChange, insertSession } from '../src/storage.js'
import { DB_PATH } from '../src/paths.js'
import { createSession } from '../src/session.js'
import { HUMAN_APPROVAL_TOKEN_ENV } from '../src/human-approval.js'
import type { ChangeSet } from '../src/types.js'

let server: http.Server
let port: number
let tmpDir: string
let previousHumanApprovalToken: string | undefined

interface ApiResponse {
  status: number
  data: unknown
}

async function apiRequest(
  srv: http.Server,
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiResponse> {
  const addr = srv.address()
  const p = addr && typeof addr === 'object' ? addr.port : port

  return new Promise((resolve, reject) => {
    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: p,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': String(Buffer.byteLength(bodyStr)) } : {}),
        ...(extraHeaders ?? {}),
      },
    }

    const req = http.request(options, (res) => {
      let raw = ''
      res.on('data', (chunk: Buffer) => { raw += chunk.toString() })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) })
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw })
        }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

beforeEach(async () => {
  previousHumanApprovalToken = process.env[HUMAN_APPROVAL_TOKEN_ENV]
  tmpDir = await mkdtemp(join(tmpdir(), 'devcontrol-int-test-'))
  await new Promise<void>((resolve, reject) => {
    server = createApiServer(0)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') port = addr.port
      resolve()
    })
    server.once('error', reject)
  })
})

afterEach(async () => {
  if (previousHumanApprovalToken === undefined) {
    delete process.env[HUMAN_APPROVAL_TOKEN_ENV]
  } else {
    process.env[HUMAN_APPROVAL_TOKEN_ENV] = previousHumanApprovalToken
  }
  await new Promise<void>((resolve, reject) => {
    server.close(err => { if (err) reject(err); else resolve() })
  })
  // Reset the storage.ts module-level singleton so the next test starts with a clean db.
  closeDb()
  await rm(tmpDir, { recursive: true, force: true })
})

function createPendingChange(sessionId: string, changeId: string): ChangeSet {
  return {
    id: changeId,
    sessionId,
    agent: 'test-agent',
    files: [{
      filepath: 'src/example.ts',
      eventType: 'modified',
      linesAdded: 1,
      linesRemoved: 0,
      outOfScope: false,
      diffContent: '+const value = 1',
      snapshotBefore: '',
      snapshotAfter: 'const value = 1',
    }],
    depsAdded: [],
    depsInvalid: [],
    riskLevel: 'LOW',
    status: 'pending',
    detectedAt: new Date().toISOString(),
    controlViolations: [],
  }
}

async function seedPendingApiChange(): Promise<{ sessionId: string; changeId: string }> {
  await apiRequest(server, 'POST', '/projects/register', { path: tmpDir })
  const db = getDb(join(tmpDir, DB_PATH))
  const sessionId = 'ds-20260719-001'
  const changeId = `${sessionId}.001`
  const session = createSession(sessionId, tmpDir, 'test-agent', 'watch')
  session.status = 'active'
  session.totalChanges = 1
  insertSession(db, session)
  insertChange(db, createPendingChange(sessionId, changeId))
  return { sessionId, changeId }
}

describe('API Integration', () => {
  it('GET /health returns 200 with status ok and version 2.1.0', async () => {
    const { status, data } = await apiRequest(server, 'GET', '/health')
    expect(status).toBe(200)
    const d = data as { status: string; version: string }
    expect(d.status).toBe('ok')
    expect(d.version).toBe('2.1.0')
  })

  it('POST /projects/register with non-existent path returns 400', async () => {
    const { status, data } = await apiRequest(server, 'POST', '/projects/register', {
      path: '/this/path/definitely/does/not/exist/on/this/machine',
    })
    expect(status).toBe(400)
    const d = data as { error: string }
    expect(typeof d.error).toBe('string')
  })

  it('POST /projects/register with valid tmpdir returns 201 with entry', async () => {
    const { status, data } = await apiRequest(server, 'POST', '/projects/register', {
      path: tmpDir,
    })
    expect(status).toBe(201)
    const d = data as { path: string; name: string; registeredAt: string }
    expect(d.path).toBe(tmpDir)
    expect(typeof d.name).toBe('string')
    expect(typeof d.registeredAt).toBe('string')
  })

  it('GET /projects returns array that includes the registered project', async () => {
    await apiRequest(server, 'POST', '/projects/register', { path: tmpDir })
    const { status, data } = await apiRequest(server, 'GET', '/projects')
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    const projects = data as Array<{ path: string }>
    expect(projects.some(p => p.path === tmpDir)).toBe(true)
  })

  it('GET /sessions with project that has no existing DB returns empty array', async () => {
    await apiRequest(server, 'POST', '/projects/register', { path: tmpDir })
    const { status, data } = await apiRequest(
      server,
      'GET',
      '/sessions',
      undefined,
      { 'X-Project-Path': tmpDir },
    )
    expect(status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect((data as unknown[]).length).toBe(0)
  })

  it('POST /sessions/start without objective returns 400', async () => {
    await apiRequest(server, 'POST', '/projects/register', { path: tmpDir })
    const { status, data } = await apiRequest(
      server,
      'POST',
      '/sessions/start',
      { agent: 'test-agent' },
      { 'X-Project-Path': tmpDir },
    )
    expect(status).toBe(400)
    const d = data as { error: string }
    expect(d.error).toMatch(/objective/)
  })

  it('POST /sessions/start with valid objective returns 201 with session id', async () => {
    await apiRequest(server, 'POST', '/projects/register', { path: tmpDir })
    const { status, data } = await apiRequest(
      server,
      'POST',
      '/sessions/start',
      { objective: 'Integration test session', agent: 'test-agent' },
      { 'X-Project-Path': tmpDir },
    )
    expect(status).toBe(201)
    const d = data as { id: string; objective: string; status: string }
    expect(typeof d.id).toBe('string')
    expect(d.id.length).toBeGreaterThan(0)
    expect(d.objective).toBe('Integration test session')
    expect(d.status).toBe('active')
  })

  it('POST /sessions/:id/changes/:cid/approve rejects missing human token', async () => {
    process.env[HUMAN_APPROVAL_TOKEN_ENV] = 'human-secret'
    const { sessionId, changeId } = await seedPendingApiChange()

    const { status, data } = await apiRequest(
      server,
      'POST',
      `/sessions/${sessionId}/changes/${changeId}/approve`,
      { message: 'approved via test' },
      { 'X-Project-Path': tmpDir },
    )

    expect(status).toBe(401)
    const d = data as { error: string }
    expect(d.error).toMatch(/token is required/i)

    const db = getDb(join(tmpDir, DB_PATH))
    expect(getChange(db, changeId)?.status).toBe('pending')
  })

  it('POST /sessions/:id/changes/:cid/approve accepts valid human token header', async () => {
    process.env[HUMAN_APPROVAL_TOKEN_ENV] = 'human-secret'
    const { sessionId, changeId } = await seedPendingApiChange()

    const { status, data } = await apiRequest(
      server,
      'POST',
      `/sessions/${sessionId}/changes/${changeId}/approve`,
      { message: 'approved via test' },
      { 'X-Project-Path': tmpDir, 'X-Human-Approval-Token': 'human-secret' },
    )

    expect(status).toBe(200)
    const d = data as { change: { status: string } }
    expect(d.change.status).toBe('approved')
  })
})
