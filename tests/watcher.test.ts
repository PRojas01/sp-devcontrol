/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { mkdtempSync, rmSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { FileWatcher } from '../src/watcher.js'
import type { DevSentinelConfig, FileChange } from '../src/types.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'devcontrol-watcher-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

function minimalConfig(watchIgnore: string[] = []): DevSentinelConfig {
  return {
    project: 'test',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    stack: ['node'],
    agents: { allowed: ['test'], default: 'test' },
    scope: {
      allowed: ['src'],
      protected: [],
      watchIgnore,
    },
    rules: {
      blockDeletes: true,
      requireApproval: false,
      autoCommit: false,
      requireMessage: false,
      maxFilesPerChange: 10,
    },
    git: {
      mainBranch: 'main',
      rejectedBranchPrefix: 'rejected/',
      commitPrefix: 'DC',
    },
    controls: {
      security: [],
      architecture: [],
      commits: [],
      testing: [],
      documentation: [],
      skills: [],
      memory: [],
      privacy: [],
    },
    skills: {
      allowedTools: [],
      approvalRequired: [],
      blockedTools: [],
      blockedBashPatterns: [],
      allowedDomains: [],
      allowedMcpServers: [],
    },
    memory: {
      scanBeforeSession: false,
      redactSecretsInContext: false,
      requireApprovalForMemoryWrites: false,
      retentionDays: 30,
      sessionTokenBudget: 50000,
      tokenAlertThreshold: 40000,
    },
    structure: 'flat',
  }
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('FileWatcher', () => {
  it('burst — collects multiple rapid file writes into one batch', async () => {
    const dir = tempProject()
    const config = minimalConfig()
    const bursts: FileChange[][] = []

    const watcher = new FileWatcher(dir, config, async (files) => {
      bursts.push(files)
    })
    watcher.start()

    await wait(600)

    writeFileSync(join(dir, 'alpha.ts'), '// alpha')
    writeFileSync(join(dir, 'beta.ts'), '// beta')
    writeFileSync(join(dir, 'gamma.ts'), '// gamma')

    await wait(3000)

    watcher.stop()
    rmSync(dir, { recursive: true, force: true })

    expect(bursts.length).toBe(1)
    expect(bursts[0].length).toBe(3)
    const paths = bursts[0].map(f => f.filepath).sort()
    expect(paths).toEqual(['alpha.ts', 'beta.ts', 'gamma.ts'])
  }, 10000)

  it('detects a newly created file and captures its content', async () => {
    const dir = tempProject()
    const config = minimalConfig()
    const bursts: FileChange[][] = []

    const watcher = new FileWatcher(dir, config, async (files) => {
      bursts.push(files)
    })
    watcher.start()

    await wait(600)

    writeFileSync(join(dir, 'new-file.ts'), 'hello world')

    await wait(3000)

    watcher.stop()
    rmSync(dir, { recursive: true, force: true })

    const all = bursts.flat()
    const match = all.find(f => f.filepath === 'new-file.ts')
    expect(match).toBeDefined()
    expect(match!.eventType).toBe('added')
    expect(match!.snapshotBefore).toBe('')
    expect(match!.snapshotAfter).toBe('hello world')
  }, 10000)

  it('detects file deletion as deleted_attempt event', async () => {
    const dir = tempProject()
    const config = minimalConfig()
    const bursts: FileChange[][] = []

    writeFileSync(join(dir, 'delete-me.ts'), 'to be deleted')

    const watcher = new FileWatcher(dir, config, async (files) => {
      bursts.push(files)
    })
    watcher.start()

    await wait(600)

    unlinkSync(join(dir, 'delete-me.ts'))

    await wait(3000)

    watcher.stop()

    const all = bursts.flat()
    const match = all.find(f => f.filepath === 'delete-me.ts')
    expect(match).toBeDefined()
    expect(match!.eventType).toBe('deleted_attempt')

    rmSync(dir, { recursive: true, force: true })
  }, 10000)

  it('ignores node_modules and .git paths', async () => {
    const dir = tempProject()
    const config = minimalConfig(['node_modules', '.git'])
    const bursts: FileChange[][] = []

    mkdirSync(join(dir, 'node_modules'), { recursive: true })
    mkdirSync(join(dir, '.git', 'hooks'), { recursive: true })
    writeFileSync(join(dir, 'node_modules', 'lodash.ts'), 'module')
    writeFileSync(join(dir, '.git', 'hooks', 'pre-commit'), 'hook')

    const watcher = new FileWatcher(dir, config, async (files) => {
      bursts.push(files)
    })
    watcher.start()

    await wait(600)

    writeFileSync(join(dir, 'node_modules', 'lodash.ts'), 'modified module')
    writeFileSync(join(dir, '.git', 'hooks', 'pre-commit'), 'modified hook')

    await wait(3000)

    // write a non-ignored file to confirm the watcher is alive
    writeFileSync(join(dir, 'tracked.ts'), 'tracked')

    await wait(3000)

    watcher.stop()

    const allPaths = bursts.flat().map(f => f.filepath)
    expect(allPaths).not.toContain('node_modules/lodash.ts')
    expect(allPaths).not.toContain('.git/hooks/pre-commit')
    expect(allPaths).toContain('tracked.ts')

    rmSync(dir, { recursive: true, force: true })
  }, 10000)

  it('handles a non-existent directory gracefully', () => {
    const dir = join(tmpdir(), 'devcontrol-watcher-nonexistent-' + Date.now())
    const config = minimalConfig()

    expect(() => {
      const watcher = new FileWatcher(dir, config, async () => {})
      watcher.start()
      watcher.stop()
    }).not.toThrow()

    rmSync(dir, { recursive: true, force: true })
  })
})
