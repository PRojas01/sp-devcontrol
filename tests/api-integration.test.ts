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
import { closeDb } from '../src/storage.js'

let server: http.Server
let port: number
let tmpDir: string

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
  await new Promise<void>((resolve, reject) => {
    server.close(err => { if (err) reject(err); else resolve() })
  })
  // Reset the storage.ts module-level singleton so the next test starts with a clean db.
  closeDb()
  await rm(tmpDir, { recursive: true, force: true })
})

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
})
