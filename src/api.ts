import http from 'http'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'
import { createRequire } from 'module'
import express, { type Request, type Response, type NextFunction } from 'express'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const PKG_VERSION: string = (require('../package.json') as { version: string }).version
import {
  getDb,
  listSessions,
  getSession,
  getChangesForSession,
  updateChangeStatus,
  getChange,
  listApprovals,
  insertApproval,
  insertSession,
  updateSession,
} from './storage.js'
import { DB_PATH } from './paths.js'
import { loadConfig, hasConfig } from './config.js'
import { generateSessionId, createSession } from './session.js'
import type { Session } from './types.js'

const DEFAULT_PORT = 7891
const GLOBAL_PROJECTS_FILE = join(homedir(), '.devcontrol', 'projects.json')
const START_TIME = Date.now()

interface ProjectEntry {
  path: string
  name: string
  registeredAt: string
}

function readProjectsRegistry(): ProjectEntry[] {
  if (!existsSync(GLOBAL_PROJECTS_FILE)) return []
  try {
    return JSON.parse(readFileSync(GLOBAL_PROJECTS_FILE, 'utf-8')) as ProjectEntry[]
  } catch {
    return []
  }
}

function writeProjectsRegistry(projects: ProjectEntry[]): void {
  const dir = join(homedir(), '.devcontrol')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(GLOBAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8')
}

function resolveProjectRoot(req: Request): string {
  const header = req.headers['x-project-path']
  if (typeof header === 'string' && header.trim()) return resolve(header.trim())
  return process.cwd()
}

function corsLocalhostMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin ?? ''
  const isLocal =
    !origin ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.startsWith('http://[::1]')

  if (!isLocal) {
    res.status(403).json({ error: 'Forbidden: only localhost connections allowed' })
    return
  }

  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Project-Path')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
}

export function createApiServer(port: number): http.Server {
  const app = express()

  app.use(express.json())
  app.use(corsLocalhostMiddleware)

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: PKG_VERSION,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
    })
  })

  app.get('/projects', (_req: Request, res: Response) => {
    try {
      res.json(readProjectsRegistry())
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.post('/projects/register', (req: Request, res: Response) => {
    try {
      const { path: projectPath } = req.body as { path?: string }
      if (!projectPath) {
        res.status(400).json({ error: 'path is required' })
        return
      }
      const absPath = resolve(projectPath)
      if (!existsSync(absPath)) {
        res.status(400).json({ error: `Path does not exist: ${absPath}` })
        return
      }

      let name = absPath.split('/').pop() ?? absPath
      if (hasConfig(absPath)) {
        try {
          const cfg = loadConfig(absPath)
          name = cfg.project || name
        } catch { /* use directory name */ }
      }

      const projects = readProjectsRegistry()
      const existing = projects.findIndex(p => p.path === absPath)
      const entry: ProjectEntry = { path: absPath, name, registeredAt: new Date().toISOString() }
      if (existing >= 0) {
        projects[existing] = entry
      } else {
        projects.push(entry)
      }
      writeProjectsRegistry(projects)
      res.status(201).json(entry)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.get('/sessions', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10)
      res.json(listSessions(db, isNaN(limit) ? 20 : limit))
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.post('/sessions/start', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const { objective, agent } = req.body as { objective?: string; agent?: string }
      if (!objective) {
        res.status(400).json({ error: 'objective is required' })
        return
      }

      let projectName = projectRoot.split('/').pop() ?? projectRoot
      if (hasConfig(projectRoot)) {
        try {
          const cfg = loadConfig(projectRoot)
          projectName = cfg.project || projectName
        } catch { /* use directory name */ }
      }

      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const id = generateSessionId()
      const session = createSession(id, projectName, agent ?? 'claude-code', 'watch')
      session.objective = objective
      session.status = 'active'
      insertSession(db, session)
      res.status(201).json(session)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.get('/sessions/:id', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const session = getSession(db, req.params['id']!)
      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }
      res.json(session)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.post('/sessions/:id/close', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const session = getSession(db, req.params['id']!)
      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }
      if (session.endedAt) {
        res.status(409).json({ error: 'Session already closed' })
        return
      }
      const updated: typeof session = {
        ...session,
        endedAt: new Date().toISOString(),
        status: 'completed',
      }
      updateSession(db, updated)
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.get('/sessions/:id/changes', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const session = getSession(db, req.params['id']!)
      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }
      res.json(getChangesForSession(db, req.params['id']!))
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.post('/sessions/:id/changes/:cid/approve', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const { id, cid } = req.params as { id: string; cid: string }
      const { message } = req.body as { message?: string }

      const session = getSession(db, id)
      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }
      const change = getChange(db, cid)
      if (!change || change.sessionId !== id) {
        res.status(404).json({ error: 'Change not found' })
        return
      }
      if (change.status !== 'pending') {
        res.status(409).json({ error: `Change is already ${change.status}` })
        return
      }

      updateChangeStatus(db, cid, 'approved', undefined, undefined, message)

      const approval = insertApproval(db, {
        sessionId: id,
        approvalType: 'change',
        target: cid,
        scope: 'session',
        reason: message ?? 'Approved via API',
        createdBy: 'user',
      })

      const updatedSession: Session = {
        ...session,
        totalChanges: session.totalChanges,
        approved: session.approved + 1,
      }
      updateSession(db, updatedSession)

      res.json({ change: getChange(db, cid), approval })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.post('/sessions/:id/changes/:cid/reject', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const dbPath = join(projectRoot, DB_PATH)
      const db = getDb(dbPath)
      const { id, cid } = req.params as { id: string; cid: string }
      const { message } = req.body as { message?: string }

      const session = getSession(db, id)
      if (!session) {
        res.status(404).json({ error: 'Session not found' })
        return
      }
      const change = getChange(db, cid)
      if (!change || change.sessionId !== id) {
        res.status(404).json({ error: 'Change not found' })
        return
      }
      if (change.status !== 'pending') {
        res.status(409).json({ error: `Change is already ${change.status}` })
        return
      }

      updateChangeStatus(db, cid, 'rejected', undefined, undefined, message)

      const updatedSession: Session = {
        ...session,
        rejected: session.rejected + 1,
      }
      updateSession(db, updatedSession)

      res.json({ change: getChange(db, cid) })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.get('/status', (req: Request, res: Response) => {
    try {
      const projectRoot = resolveProjectRoot(req)
      const configured = hasConfig(projectRoot)

      let config = null
      if (configured) {
        try { config = loadConfig(projectRoot) } catch { /* ignore */ }
      }

      const dbPath = join(projectRoot, DB_PATH)
      let activeSessions = 0
      let pendingChanges = 0
      let totalSessions = 0

      if (existsSync(resolve(dbPath.endsWith('.json') ? dbPath : `${dbPath}.json`))) {
        try {
          const db = getDb(dbPath)
          const sessions = listSessions(db, 1000)
          totalSessions = sessions.length
          activeSessions = sessions.filter(s => !s.endedAt).length
          const activeSession = sessions.find(s => !s.endedAt)
          if (activeSession) {
            pendingChanges = getChangesForSession(db, activeSession.id)
              .filter(c => c.status === 'pending').length
          }
        } catch { /* db not yet initialized */ }
      }

      res.json({
        project: config?.project ?? projectRoot.split('/').pop(),
        projectRoot,
        configured,
        activeSessions,
        totalSessions,
        pendingChanges,
        version: config?.version ?? '2.0.0',
        stack: config?.stack ?? [],
      })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  return http.createServer(app)
}

let activeServer: http.Server | null = null

export async function startApiServer(port: number = DEFAULT_PORT): Promise<void> {
  if (activeServer) return

  return new Promise((resolvePromise, reject) => {
    const server = createApiServer(port)
    server.listen(port, '127.0.0.1', () => {
      activeServer = server
      resolvePromise()
    })
    server.once('error', reject)
  })
}

export async function stopApiServer(): Promise<void> {
  if (!activeServer) return

  return new Promise((resolvePromise, reject) => {
    activeServer!.close(err => {
      if (err) { reject(err); return }
      activeServer = null
      resolvePromise()
    })
  })
}
