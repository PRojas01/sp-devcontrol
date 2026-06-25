import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { installHooks, uninstallHooks, checkHooksInstalled } from '../src/hooks.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-hooks-'))
  mkdirSync(join(dir, '.git', 'hooks'), { recursive: true })
  return dir
}

describe('git hooks', () => {
  it('installs all three hooks', () => {
    const dir = tempProject()
    const result = installHooks(dir)
    expect(result.installed).toContain('pre-commit')
    expect(result.installed).toContain('pre-push')
    expect(result.installed).toContain('commit-msg')
    expect(result.errors).toHaveLength(0)

    const preCommit = readFileSync(join(dir, '.git', 'hooks', 'pre-commit'), 'utf-8')
    expect(preCommit).toContain('SP-DevControl managed hook')
    expect(preCommit).toContain('COMMIT BLOCKED')
    rmSync(dir, { recursive: true, force: true })
  })

  it('detects installed and missing hooks', () => {
    const dir = tempProject()
    installHooks(dir)
    const status = checkHooksInstalled(dir)
    expect(status.installed).toHaveLength(3)
    expect(status.missing).toHaveLength(0)
    rmSync(dir, { recursive: true, force: true })
  })

  it('uninstalls managed hooks', () => {
    const dir = tempProject()
    installHooks(dir)
    const result = uninstallHooks(dir)
    expect(result.installed).toContain('pre-commit')
    expect(existsSync(join(dir, '.git', 'hooks', 'pre-commit'))).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('does not overwrite non-managed hooks without force', () => {
    const dir = tempProject()
    const { writeFileSync } = require('fs') as typeof import('fs')
    writeFileSync(join(dir, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho custom', 'utf-8')
    const result = installHooks(dir, false)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]).toContain('pre-commit')
    rmSync(dir, { recursive: true, force: true })
  })
})
