/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import chokidar, { FSWatcher } from 'chokidar'
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { resolve, relative, join } from 'path'
import chalk from 'chalk'
import type { DevSentinelConfig, FileChange } from './types.js'
import { checkScope } from './analyzer.js'
import { generateDiff, countDiffLines } from './diff.js'

const BURST_WINDOW_MS = 2000

interface SnapshotEntry {
  content: string
  capturedAt: number
}

interface PendingBurst {
  files: Map<string, { before: string; after: string; eventType: 'modified' | 'added' | 'deleted_attempt' }>
  timer: ReturnType<typeof setTimeout>
}

export class FileWatcher {
  private watcher: FSWatcher | null = null
  private snapshots = new Map<string, SnapshotEntry>()
  private pending: PendingBurst | null = null

  constructor(
    private projectRoot: string,
    private config: DevSentinelConfig,
    private onBurst: (files: FileChange[]) => Promise<void>,
  ) {}

  start(): void {
    const ignored = [
      ...this.config.scope.watchIgnore.map(p => `**/${p}**`),
      '**/node_modules/**',
      '**/.git/**',
      '**/.devcontrol/**',
    ]

    this.watcher = chokidar.watch(this.projectRoot, {
      ignored,
      persistent: true,
      ignoreInitial: true,
      usePolling: process.platform === 'win32',
      interval: 300,
    })

    this.watcher
      .on('add', (absPath) => this.handleAdd(absPath))
      .on('change', (absPath) => this.handleChange(absPath))
      .on('unlink', (absPath) => this.handleUnlink(absPath))
      .on('error', (err) => console.error(chalk.red('[watcher error]'), err))

    console.log(chalk.green(`✓ Watching ${this.projectRoot}`))
    this.captureInitialSnapshots()
  }

  stop(): void {
    if (this.watcher) {
      void this.watcher.close()
      this.watcher = null
    }
    if (this.pending?.timer) {
      clearTimeout(this.pending.timer)
    }
  }

  private captureInitialSnapshots(): void {
    // Snapshots are captured lazily on first event
  }

  private getRelative(absPath: string): string {
    return relative(this.projectRoot, absPath).replace(/\\/g, '/')
  }

  private readFile(absPath: string): string {
    if (!existsSync(absPath)) return ''
    try {
      return readFileSync(absPath, 'utf-8')
    } catch {
      return ''
    }
  }

  private ensureSnapshot(absPath: string): string {
    const rel = this.getRelative(absPath)
    if (!this.snapshots.has(rel)) {
      this.snapshots.set(rel, { content: this.readFile(absPath), capturedAt: Date.now() })
    }
    return this.snapshots.get(rel)!.content
  }

  private handleAdd(absPath: string): void {
    const rel = this.getRelative(absPath)
    const after = this.readFile(absPath)
    this.snapshots.set(rel, { content: after, capturedAt: Date.now() })
    this.addToBurst(rel, '', after, 'added')
  }

  private handleChange(absPath: string): void {
    const rel = this.getRelative(absPath)
    const before = this.ensureSnapshot(absPath)
    const after = this.readFile(absPath)
    this.snapshots.set(rel, { content: after, capturedAt: Date.now() })
    this.addToBurst(rel, before, after, 'modified')
  }

  private handleUnlink(absPath: string): void {
    const rel = this.getRelative(absPath)
    const before = this.ensureSnapshot(absPath)

    // Rule #1: Block deletion — archive file
    const archiveDir = join(this.projectRoot, '.devcontrol', 'deleted-attempts')
    if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true })

    if (existsSync(absPath)) {
      const dest = join(archiveDir, rel.replace(/\//g, '_') + '_' + Date.now())
      copyFileSync(absPath, dest)
    }

    console.log(chalk.red.bold(`\n⚠ DELETE BLOCKED: ${rel}`))
    console.log(chalk.gray('  File preserved in .devcontrol/deleted-attempts/'))

    this.addToBurst(rel, before, '', 'deleted_attempt')
  }

  private isIgnored(filepath: string): boolean {
    const ignoredPatterns = [
      ...this.config.scope.watchIgnore,
      'node_modules',
      '.git',
      '.devcontrol',
    ]
    return ignoredPatterns.some(p => filepath.startsWith(p + '/') || filepath.includes('/' + p + '/') || filepath === p)
  }

  private addToBurst(
    filepath: string,
    before: string,
    after: string,
    eventType: 'modified' | 'added' | 'deleted_attempt',
  ): void {
    if (this.isIgnored(filepath)) return
    if (!this.pending) {
      this.pending = { files: new Map(), timer: setTimeout(() => void this.flushBurst(), BURST_WINDOW_MS) }
    } else {
      clearTimeout(this.pending.timer)
      this.pending.timer = setTimeout(() => void this.flushBurst(), BURST_WINDOW_MS)
    }
    this.pending.files.set(filepath, { before, after, eventType })
  }

  private async flushBurst(): Promise<void> {
    if (!this.pending) return
    const burst = this.pending
    this.pending = null

    const fileChanges: FileChange[] = []
    for (const [filepath, data] of burst.files) {
      const diff = generateDiff(data.before, data.after, filepath)
      const stats = countDiffLines(data.before, data.after)
      fileChanges.push({
        filepath,
        eventType: data.eventType,
        linesAdded: stats.linesAdded,
        linesRemoved: stats.linesRemoved,
        outOfScope: checkScope(filepath, this.config),
        diffContent: diff,
        snapshotBefore: data.before,
        snapshotAfter: data.after,
      })
    }

    if (fileChanges.length === 0) return
    await this.onBurst(fileChanges)
  }
}
