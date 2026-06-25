/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, readFileSync, lstatSync, realpathSync } from 'fs'
import { resolve, extname, isAbsolute } from 'path'
import { countDiffLines, generateDiff } from './diff.js'
import type { FileChange, AnalysisResult, DevSentinelConfig, RiskLevel } from './types.js'

const HIGH_RISK_EXTENSIONS = new Set(['.env', '.pem', '.key', '.p12', '.pfx', '.db', '.sqlite'])
const HIGH_RISK_FILES = new Set(['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.env', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts'])

export function analyzeChanges(files: FileChange[], config: DevSentinelConfig, projectRoot: string): AnalysisResult {
  const filesOutOfScope: string[] = []
  const deleteAttempts: string[] = []
  const warnings: string[] = []
  const depsAdded: string[] = []
  const depsInvalid: string[] = []

  for (const file of files) {
    if (file.eventType === 'deleted_attempt') {
      deleteAttempts.push(file.filepath)
    }
    if (file.outOfScope) {
      filesOutOfScope.push(file.filepath)
    }
  }

  const pkgChange = files.find(f => f.filepath.endsWith('package.json'))
  if (pkgChange) {
    const { added, invalid } = extractDepsFromDiff(pkgChange.diffContent, projectRoot)
    depsAdded.push(...added)
    depsInvalid.push(...invalid)
  }

  const riskLevel = estimateRisk(files, filesOutOfScope, deleteAttempts, depsInvalid)

  if (depsAdded.length > 0) {
    warnings.push(`New dependencies: ${depsAdded.join(', ')}`)
  }
  if (depsInvalid.length > 0) {
    warnings.push(`Potentially invalid packages (verify manually): ${depsInvalid.join(', ')}`)
  }
  if (filesOutOfScope.length > 0) {
    warnings.push(`Files outside authorized scope: ${filesOutOfScope.join(', ')}`)
  }
  if (files.length > config.rules.maxFilesPerChange) {
    warnings.push(`Changeset has ${files.length} files (max: ${config.rules.maxFilesPerChange})`)
  }

  return { riskLevel, depsAdded, depsInvalid, filesOutOfScope, deleteAttempts, warnings }
}

export function estimateRisk(
  files: FileChange[],
  outOfScope: string[],
  deleteAttempts: string[],
  depsInvalid: string[],
): RiskLevel {
  if (deleteAttempts.length > 0) return 'HIGH'
  if (outOfScope.length > 0) return 'HIGH'
  if (depsInvalid.length > 0) return 'HIGH'

  for (const file of files) {
    const ext = extname(file.filepath).toLowerCase()
    const base = file.filepath.split('/').pop() ?? ''
    if (HIGH_RISK_EXTENSIONS.has(ext) || HIGH_RISK_FILES.has(base)) return 'HIGH'
  }

  const totalLines = files.reduce((sum, f) => sum + f.linesAdded + f.linesRemoved, 0)
  if (totalLines > 200 || files.length > 10) return 'MEDIUM'

  return 'LOW'
}

export function checkScope(filepath: string, config: DevSentinelConfig, projectRoot?: string): boolean {
  const normalized = filepath.replace(/\\/g, '/')
  let resolvedPath = normalized

  if (projectRoot) {
    try {
      const absPath = isAbsolute(normalized) ? normalized : resolve(projectRoot, normalized)
      if (lstatSync(absPath).isSymbolicLink()) {
        const real = realpathSync(absPath).replace(/\\/g, '/')
        const rel = isAbsolute(real) ? real : real
        resolvedPath = rel.startsWith(projectRoot.replace(/\\/g, '/'))
          ? rel.slice(projectRoot.replace(/\\/g, '/').length + 1)
          : rel
      }
    } catch { /* not a symlink or not accessible */ }
  }

  for (const prot of config.scope.protected) {
    const p = prot.replace(/\*/g, '').replace(/\\/g, '/')
    if (resolvedPath.includes(p) || resolvedPath === p) return true
  }
  for (const allowed of config.scope.allowed) {
    const a = allowed.replace(/\\/g, '/')
    if (resolvedPath.startsWith(a) || resolvedPath === a.replace(/\/$/, '')) return false
  }
  return true
}

export function buildFileChanges(
  files: Array<{ filepath: string; before: string; after: string; eventType: 'modified' | 'added' | 'deleted_attempt' }>,
  config: DevSentinelConfig,
): FileChange[] {
  return files.map(f => {
    const diff = generateDiff(f.before, f.after, f.filepath)
    const stats = countDiffLines(f.before, f.after)
    return {
      filepath: f.filepath,
      eventType: f.eventType,
      linesAdded: stats.linesAdded,
      linesRemoved: stats.linesRemoved,
      outOfScope: checkScope(f.filepath, config),
      diffContent: diff,
      snapshotBefore: f.before,
      snapshotAfter: f.after,
    }
  })
}

export function extractDepsFromDiff(diffContent: string, _projectRoot: string): { added: string[]; invalid: string[] } {
  const added: string[] = []
  const invalid: string[] = []

  const addedLines = diffContent.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'))

  let inDeps = false
  for (const line of addedLines) {
    const clean = line.slice(1).trim()
    if (clean.includes('"dependencies"') || clean.includes('"devDependencies"')) {
      inDeps = true
      continue
    }
    if (inDeps && clean === '}') {
      inDeps = false
      continue
    }
    if (inDeps) {
      const match = clean.match(/"([^"]+)":\s*"([^"]+)"/)
      if (match) {
        const pkgName = match[1]
        const version = match[2]
        added.push(`${pkgName}@${version}`)
        if (version === '*' || version === 'latest' || version === '') {
          invalid.push(`${pkgName} (unpinned version: ${version})`)
        }
        if (pkgName.includes(' ') || pkgName.length > 214) {
          invalid.push(`${pkgName} (suspicious name)`)
        }
      }
    }
  }

  return { added, invalid }
}
