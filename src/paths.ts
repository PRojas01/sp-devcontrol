import { join } from 'path'

export const CONTROL_DIR = '.devcontrol'
export const MEMORY_DIR = join(CONTROL_DIR, 'memory')
export const SESSIONS_DIR = join(CONTROL_DIR, 'sessions')
export const DB_PATH = join(CONTROL_DIR, 'storage', 'devcontrol.db')

export function dateFolder(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}
