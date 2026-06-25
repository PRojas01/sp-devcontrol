import http from 'http'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApiServer } from '../src/api.js'

let server: http.Server | null = null
let port = 0

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
  })
}

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server = createApiServer(0)
    server.listen(0, '127.0.0.1', () => {
      const addr = server!.address()
      if (addr && typeof addr === 'object') {
        port = addr.port
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
  }
})

describe('createApiServer', () => {
  it('returns an http.Server instance with a listen method', () => {
    // server is already created in beforeEach
    expect(server).not.toBeNull()
    expect(typeof server!.listen).toBe('function')
  })

  it('GET /health returns status ok', async () => {
    const { statusCode, body } = await httpGet(`http://127.0.0.1:${port}/health`)
    expect(statusCode).toBe(200)
    const json = JSON.parse(body) as { status: string }
    expect(json.status).toBe('ok')
  })

  it('GET /health response contains version field', async () => {
    const { body } = await httpGet(`http://127.0.0.1:${port}/health`)
    const json = JSON.parse(body) as { version: string }
    expect(typeof json.version).toBe('string')
  })

  it('GET /projects returns an array', async () => {
    const { statusCode, body } = await httpGet(`http://127.0.0.1:${port}/projects`)
    expect(statusCode).toBe(200)
    const json = JSON.parse(body) as unknown[]
    expect(Array.isArray(json)).toBe(true)
  })
})
