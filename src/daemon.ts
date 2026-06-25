/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
  chmodSync,
} from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { randomBytes } from 'crypto'
import { fileURLToPath } from 'url'
import { spawn, spawnSync } from 'child_process'
import { isWindows } from './platform.js'

const DEVCONTROL_HOME = join(homedir(), '.devcontrol')
const PID_PATH = join(DEVCONTROL_HOME, 'daemon.pid')
const LOG_PATH = join(DEVCONTROL_HOME, 'daemon.log')
const STATE_PATH = join(DEVCONTROL_HOME, 'daemon-state.json')
const LOCK_PATH = join(DEVCONTROL_HOME, 'daemon.lock')
const TOKEN_PATH = join(DEVCONTROL_HOME, 'api-token')

// Derive the CLI entry point path from this module's location (dist/daemon.js → dist/cli.js)
const CLI_PATH = join(dirname(fileURLToPath(import.meta.url)), 'cli.js')

const DEFAULT_API_PORT = 7891
const DEFAULT_WS_PORT = 7892

export interface DaemonStatus {
  running: boolean
  pid?: number
  apiPort: number
  wsPort: number
  startedAt?: string
  projectsWatched: number
}

interface DaemonState {
  pid: number
  apiPort: number
  wsPort: number
  startedAt: string
  projectsWatched: number
}

export function getDaemonPidPath(): string {
  return PID_PATH
}

export function getDaemonLogPath(): string {
  return LOG_PATH
}

function ensureHomeDir(): void {
  if (!existsSync(DEVCONTROL_HOME)) {
    mkdirSync(DEVCONTROL_HOME, { recursive: true })
  }
}

function readPid(): number | null {
  if (!existsSync(PID_PATH)) return null
  try {
    const raw = readFileSync(PID_PATH, 'utf8').trim()
    const pid = parseInt(raw, 10)
    return Number.isFinite(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

function readState(): DaemonState | null {
  if (!existsSync(STATE_PATH)) return null
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as DaemonState
  } catch {
    return null
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function removePidFiles(): void {
  for (const p of [PID_PATH, STATE_PATH, TOKEN_PATH]) {
    try {
      if (existsSync(p)) unlinkSync(p)
    } catch {
      // best-effort cleanup
    }
  }
}

async function waitUntilDead(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true
    await new Promise<void>((r) => setTimeout(r, 100))
  }
  return !isProcessAlive(pid)
}

export function getApiToken(): string | null {
  try {
    return existsSync(TOKEN_PATH) ? readFileSync(TOKEN_PATH, 'utf-8').trim() || null : null
  } catch {
    return null
  }
}

export async function startDaemon(
  apiPort: number = DEFAULT_API_PORT,
  wsPort: number = DEFAULT_WS_PORT,
): Promise<void> {
  ensureHomeDir()

  // Atomic lock: openSync with 'wx' fails if file already exists (O_CREAT|O_EXCL)
  let lockFd: number
  try {
    lockFd = openSync(LOCK_PATH, 'wx')
  } catch {
    throw new Error('Another daemon start is already in progress (lock file exists). Try again in a moment.')
  }

  try {
    const existingPid = readPid()
    if (existingPid !== null && isProcessAlive(existingPid)) {
      throw new Error(`Daemon is already running (PID ${existingPid})`)
    }

    removePidFiles()

    // Generate a random 32-byte auth token for this daemon lifetime
    const apiToken = randomBytes(32).toString('hex')
    writeFileSync(TOKEN_PATH, apiToken, 'utf8')
    try { chmodSync(TOKEN_PATH, 0o600) } catch { /* non-critical on Windows */ }

    const logFd = openSync(LOG_PATH, 'a')

    const child = spawn(
      process.execPath,
      [
        CLI_PATH,
        '__daemon_worker__',
        `--api-port=${apiPort}`,
        `--ws-port=${wsPort}`,
      ],
      {
        detached: true,
        shell: false,
        stdio: ['ignore', logFd, logFd],
        env: {
          ...process.env,
          DEVCONTROL_DAEMON: '1',
          DEVCONTROL_API_PORT: String(apiPort),
          DEVCONTROL_WS_PORT: String(wsPort),
          DEVCONTROL_API_TOKEN: apiToken,
        },
      },
    )

    const pid = child.pid
    if (pid === undefined) {
      try { closeSync(logFd) } catch { /* best-effort */ }
      throw new Error('Failed to obtain PID from spawned daemon process')
    }

    child.unref()
    try { closeSync(logFd) } catch { /* best-effort */ }

    writeFileSync(PID_PATH, String(pid), 'utf8')

    const state: DaemonState = {
      pid,
      apiPort,
      wsPort,
      startedAt: new Date().toISOString(),
      projectsWatched: 0,
    }
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
  } finally {
    try { closeSync(lockFd) } catch { /* best-effort */ }
    try { unlinkSync(LOCK_PATH) } catch { /* best-effort */ }
  }
}

export async function stopDaemon(): Promise<void> {
  const pid = readPid()

  if (pid === null || !isProcessAlive(pid)) {
    removePidFiles()
    throw new Error('Daemon is not running')
  }

  if (isWindows()) {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T'], {
      stdio: 'ignore',
    })
    if (result.status !== 0) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
      })
    }
  } else {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // process may have already exited
    }
  }

  const died = await waitUntilDead(pid, 5000)

  if (!died) {
    if (isWindows()) {
      spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
      })
    } else {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // already gone
      }
    }

    await waitUntilDead(pid, 2000)
  }

  removePidFiles()
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  const state = readState()
  const pid = readPid()

  const apiPort = state?.apiPort ?? DEFAULT_API_PORT
  const wsPort = state?.wsPort ?? DEFAULT_WS_PORT

  if (pid === null || !isProcessAlive(pid)) {
    if (pid !== null) removePidFiles()
    return {
      running: false,
      apiPort,
      wsPort,
      projectsWatched: 0,
    }
  }

  return {
    running: true,
    pid,
    apiPort,
    wsPort,
    startedAt: state?.startedAt,
    projectsWatched: state?.projectsWatched ?? 0,
  }
}
