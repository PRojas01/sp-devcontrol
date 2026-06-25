/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import http from 'http'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiServer } from '../src/api.js'

const VALID_TOKEN = 'test-token-12345'

interface HttpResponse {
  statusCode: number
  body: string
}

function httpGet(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
  })
}

function httpGetWithHeaders(url: string, headers: http.OutgoingHttpHeaders): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = http.get(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }))
      },
    )
    req.on('error', reject)
  })
}

let server: http.Server | null = null
let port = 0
let baseUrl = ''

describe('API auth middleware', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server = createApiServer(0, VALID_TOKEN)
      server.listen(0, '127.0.0.1', () => {
        const addr = server!.address()
        if (addr && typeof addr === 'object') {
          port = addr.port
          baseUrl = `http://127.0.0.1:${port}`
        }
        resolve()
      })
      server.once('error', reject)
    })
  })

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close(err => { if (err) reject(err); else resolve() })
      })
      server = null
      port = 0
      baseUrl = ''
    }
  })

  it('returns 401 without token for protected endpoints', async () => {
    const { statusCode, body } = await httpGet(`${baseUrl}/projects`)
    expect(statusCode).toBe(401)
    const json = JSON.parse(body) as { error: string }
    expect(json.error).toMatch(/unauthorized/i)
  })

  it('returns 200 with valid token', async () => {
    const { statusCode, body } = await httpGetWithHeaders(`${baseUrl}/projects`, {
      Authorization: `Bearer ${VALID_TOKEN}`,
    })
    expect(statusCode).toBe(200)
    const json = JSON.parse(body) as unknown
    expect(Array.isArray(json)).toBe(true)
  })

  it('returns 401 with invalid token', async () => {
    const { statusCode, body } = await httpGetWithHeaders(`${baseUrl}/projects`, {
      Authorization: 'Bearer wrong-token',
    })
    expect(statusCode).toBe(401)
    const json = JSON.parse(body) as { error: string }
    expect(json.error).toMatch(/unauthorized/i)
  })

  it('allows public /health endpoint without token', async () => {
    const { statusCode, body } = await httpGet(`${baseUrl}/health`)
    expect(statusCode).toBe(200)
    const json = JSON.parse(body) as { status: string }
    expect(json.status).toBe('ok')
  })

  it('rejects malformed Authorization header (no Bearer prefix)', async () => {
    const { statusCode, body } = await httpGetWithHeaders(`${baseUrl}/projects`, {
      Authorization: VALID_TOKEN,
    })
    expect(statusCode).toBe(401)
    const json = JSON.parse(body) as { error: string }
    expect(json.error).toMatch(/unauthorized/i)
  })
})
