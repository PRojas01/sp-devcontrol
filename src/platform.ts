/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { chmodSync } from 'fs'
import { tmpdir } from 'os'

export function isWindows(): boolean {
  return process.platform === 'win32'
}

export function normalizePath(filepath: string): string {
  return filepath.replace(/\\/g, '/')
}

export function safeChmod(filePath: string, mode: number): void {
  try {
    chmodSync(filePath, mode)
  } catch {
    // Windows does not support Unix file permissions — hooks still work without chmod
  }
}

export function tempDir(): string {
  return normalizePath(tmpdir())
}

export function onExit(callback: () => void): void {
  const handler = () => {
    callback()
    process.exit(0)
  }
  process.once('SIGINT', handler)
  process.once('SIGTERM', handler)
  if (!isWindows()) {
    process.once('SIGHUP', handler)
  }
  process.once('exit', () => callback())
}
