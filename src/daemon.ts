import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  unlinkSync,
} from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { spawn, spawnSync } from 'child_process'
import { isWindows } from './platform.js'

const DEVCONTROL_HOME = join(homedir(), '.devcontrol')
const PID_PATH = join(DEVCONTROL_HOME, 'daemon.pid')
const LOG_PATH = join(DEVCONTROL_HOME, 'daemon.log')
const STATE_PATH = join(DEVCONTROL_HOME, 'daemon-state.json')

const DEFAULT_API_PORT = 7700
const DEFAULT_WS_PORT = 7701

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
  for (const p of [PID_PATH, STATE_PATH]) {
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

export async function startDaemon(
  apiPort: number = DEFAULT_API_PORT,
  wsPort: number = DEFAULT_WS_PORT,
): Promise<void> {
  ensureHomeDir()

  const existingPid = readPid()
  if (existingPid !== null && isProcessAlive(existingPid)) {
    throw new Error(`Daemon is already running (PID ${existingPid})`)
  }

  removePidFiles()

  const logFd = openSync(LOG_PATH, 'a')

  const child = spawn(
    process.execPath,
    [
      process.argv[1],
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
      },
    },
  )

  const pid = child.pid
  if (pid === undefined) {
    throw new Error('Failed to obtain PID from spawned daemon process')
  }

  child.unref()

  writeFileSync(PID_PATH, String(pid), 'utf8')

  const state: DaemonState = {
    pid,
    apiPort,
    wsPort,
    startedAt: new Date().toISOString(),
    projectsWatched: 0,
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
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
