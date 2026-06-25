/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { createTwoFilesPatch, diffLines } from 'diff'
import chalk from 'chalk'

export interface DiffStats {
  linesAdded: number
  linesRemoved: number
  hunks: number
}

export function generateDiff(before: string, after: string, filepath: string): string {
  return createTwoFilesPatch(
    `a/${filepath}`,
    `b/${filepath}`,
    before,
    after,
    undefined,
    undefined,
    { context: 3 },
  )
}

export function renderDiff(diffContent: string): string {
  if (!diffContent.trim()) return chalk.gray('  (no changes)')
  const lines = diffContent.split('\n')
  const rendered: string[] = []

  for (const line of lines) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      rendered.push(chalk.bold.white(line))
    } else if (line.startsWith('@@')) {
      rendered.push(chalk.cyan(line))
    } else if (line.startsWith('+')) {
      rendered.push(chalk.green(line))
    } else if (line.startsWith('-')) {
      rendered.push(chalk.red(line))
    } else {
      rendered.push(chalk.gray(line))
    }
  }
  return rendered.join('\n')
}

export function countDiffLines(before: string, after: string): DiffStats {
  const changes = diffLines(before, after)
  let added = 0
  let removed = 0
  let hunks = 0
  let inHunk = false

  for (const part of changes) {
    if (part.added) {
      added += part.count ?? 0
      if (!inHunk) { hunks++; inHunk = true }
    } else if (part.removed) {
      removed += part.count ?? 0
      if (!inHunk) { hunks++; inHunk = true }
    } else {
      inHunk = false
    }
  }
  return { linesAdded: added, linesRemoved: removed, hunks }
}

export function renderFileDiff(filepath: string, diffContent: string): string {
  const header = chalk.bold.blue(`\n─── ${filepath} ${'─'.repeat(Math.max(0, 50 - filepath.length))}`)
  return `${header}\n${renderDiff(diffContent)}`
}

export function isEmptyDiff(diffContent: string): boolean {
  const lines = diffContent.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'))
  const meaningful = lines.filter(l => !l.startsWith('+++') && !l.startsWith('---'))
  return meaningful.length === 0
}
