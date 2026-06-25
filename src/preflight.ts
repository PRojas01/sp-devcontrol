/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'
import { CONTROL_DIR, MEMORY_DIR, SESSIONS_DIR } from './paths.js'
import { hasConfig, loadConfig } from './config.js'
import type { DevSentinelConfig } from './types.js'
import type { JsonDb } from './storage.js'
import { listSessions } from './storage.js'

export type GateSeverity = 'error' | 'warning' | 'info'
export type ProjectPhase = 'uninitialized' | 'initialized' | 'designed' | 'development' | 'testing' | 'release'

export interface PreflightCheck {
  id: string
  category: 'git' | 'config' | 'docs' | 'policy' | 'session' | 'phase'
  severity: GateSeverity
  passed: boolean
  message: string
  fix?: string
}

export interface PreflightResult {
  passed: boolean
  phase: ProjectPhase
  checks: PreflightCheck[]
  errors: PreflightCheck[]
  warnings: PreflightCheck[]
  blockers: string[]
}

const REQUIRED_DOCS: Array<{ file: string; label: string; minContentLength: number }> = [
  { file: '00-project-brief.md', label: 'Project Brief', minContentLength: 100 },
  { file: '01-requirements.md', label: 'Requirements', minContentLength: 100 },
  { file: '02-architecture.md', label: 'Architecture', minContentLength: 100 },
  { file: '06-security-rules.md', label: 'Security Rules', minContentLength: 50 },
  { file: '07-agent-rules.md', label: 'Agent Rules', minContentLength: 50 },
]

const PLACEHOLDER_PATTERNS = [
  /^-\s*(nombre|objetivo|stack|modulos|funcionales|no funcionales):\s*pendiente\s*$/im,
  /^#\s+\w+\s*\n\s*-\s*\w+:\s*pendiente\s*$/m,
]

function isPlaceholderDoc(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  if (lines.length < 2) return true
  const meaningful = lines.filter(l => !PLACEHOLDER_PATTERNS.some(p => p.test(l)))
  return meaningful.length < 2
}

export function detectProjectPhase(projectRoot: string, database?: JsonDb): ProjectPhase {
  if (!existsSync(resolve(projectRoot, CONTROL_DIR))) return 'uninitialized'
  if (!hasConfig(projectRoot)) return 'uninitialized'

  const docsDir = resolve(projectRoot, 'docs')
  if (!existsSync(docsDir)) return 'initialized'

  const docsComplete = REQUIRED_DOCS.every(doc => {
    const path = join(docsDir, doc.file)
    if (!existsSync(path)) return false
    const content = readFileSync(path, 'utf-8')
    return !isPlaceholderDoc(content) && content.length >= doc.minContentLength
  })

  if (!docsComplete) return 'initialized'

  if (database) {
    const sessions = listSessions(database, 50)
    const closedSessions = sessions.filter(s => s.status === 'completed')
    if (closedSessions.length >= 1) {
      const hasTests = existsSync(resolve(projectRoot, 'tests')) &&
        readdirSync(resolve(projectRoot, 'tests')).some(f => f.endsWith('.test.ts') || f.endsWith('.test.js'))
      if (hasTests) return 'testing'
      return 'development'
    }
  }

  return 'designed'
}

export function runPreflightChecks(projectRoot: string, database?: JsonDb): PreflightResult {
  const checks: PreflightCheck[] = []

  checks.push(checkGitPresent(projectRoot))
  checks.push(checkGitClean(projectRoot))
  checks.push(checkConfigExists(projectRoot))
  checks.push(checkConfigComplete(projectRoot))
  checks.push(...checkDocsExist(projectRoot))
  checks.push(...checkDocsContent(projectRoot))
  checks.push(checkPolicyExists(projectRoot))
  checks.push(checkProtectedPaths(projectRoot))
  checks.push(checkStackDefined(projectRoot))
  if (database) {
    checks.push(checkNoOpenSessions(database))
  }

  const errors = checks.filter(c => !c.passed && c.severity === 'error')
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning')
  const blockers = errors.map(e => e.message)
  const phase = detectProjectPhase(projectRoot, database)

  return {
    passed: errors.length === 0,
    phase,
    checks,
    errors,
    warnings,
    blockers,
  }
}

export function runSessionPreflightChecks(
  projectRoot: string,
  database: JsonDb,
  requireDesignPhase: boolean = true,
): PreflightResult {
  const base = runPreflightChecks(projectRoot, database)

  if (requireDesignPhase) {
    const phase = base.phase
    if (phase === 'uninitialized') {
      base.checks.push({
        id: 'phase-uninitialized',
        category: 'phase',
        severity: 'error',
        passed: false,
        message: 'Project not initialized. Run "sp-devcontrol init" first.',
        fix: 'sp-devcontrol init',
      })
    } else if (phase === 'initialized') {
      base.checks.push({
        id: 'phase-docs-incomplete',
        category: 'phase',
        severity: 'error',
        passed: false,
        message: 'Design documents are incomplete. Complete docs/ before starting development sessions.',
        fix: 'Fill in docs/00-project-brief.md, docs/01-requirements.md, and docs/02-architecture.md with real content (not "pendiente").',
      })
    }

    const errors = base.checks.filter(c => !c.passed && c.severity === 'error')
    base.errors = errors
    base.blockers = errors.map(e => e.message)
    base.passed = errors.length === 0
  }

  return base
}

function checkGitPresent(projectRoot: string): PreflightCheck {
  const hasGit = existsSync(resolve(projectRoot, '.git'))
  return {
    id: 'git-present',
    category: 'git',
    severity: 'error',
    passed: hasGit,
    message: hasGit ? 'Git repository present' : 'No Git repository found',
    fix: 'git init',
  }
}

function checkGitClean(projectRoot: string): PreflightCheck {
  const gitDir = resolve(projectRoot, '.git')
  if (!existsSync(gitDir)) {
    return { id: 'git-clean', category: 'git', severity: 'info', passed: true, message: 'Git check skipped (no repo)' }
  }
  return { id: 'git-clean', category: 'git', severity: 'info', passed: true, message: 'Git repository present and accessible' }
}

function checkConfigExists(projectRoot: string): PreflightCheck {
  const has = hasConfig(projectRoot)
  return {
    id: 'config-exists',
    category: 'config',
    severity: 'error',
    passed: has,
    message: has ? 'Config file present' : 'No .devcontrol/config.json found',
    fix: 'sp-devcontrol init',
  }
}

function checkConfigComplete(projectRoot: string): PreflightCheck {
  if (!hasConfig(projectRoot)) {
    return { id: 'config-complete', category: 'config', severity: 'error', passed: false, message: 'Config missing', fix: 'sp-devcontrol init' }
  }
  try {
    const config = loadConfig(projectRoot)
    const issues: string[] = []
    if (!config.project || config.project === '') issues.push('project name empty')
    if (config.stack.length === 0) issues.push('stack not defined')
    if (config.agents.allowed.length === 0) issues.push('no agents authorized')

    const passed = issues.length === 0
    return {
      id: 'config-complete',
      category: 'config',
      severity: issues.some(i => i.includes('stack')) ? 'warning' : 'info',
      passed,
      message: passed ? 'Config complete' : `Config incomplete: ${issues.join(', ')}`,
      fix: 'Update .devcontrol/config.json with project name, stack, and agents',
    }
  } catch {
    return { id: 'config-complete', category: 'config', severity: 'error', passed: false, message: 'Config file corrupted or unreadable' }
  }
}

function checkDocsExist(projectRoot: string): PreflightCheck[] {
  return REQUIRED_DOCS.map(doc => {
    const path = join(resolve(projectRoot, 'docs'), doc.file)
    const exists = existsSync(path)
    return {
      id: `doc-exists-${doc.file}`,
      category: 'docs' as const,
      severity: 'warning' as GateSeverity,
      passed: exists,
      message: exists ? `${doc.label} exists` : `${doc.label} missing (${doc.file})`,
      fix: `Create docs/${doc.file} with project ${doc.label.toLowerCase()} content`,
    }
  })
}

function checkDocsContent(projectRoot: string): PreflightCheck[] {
  return REQUIRED_DOCS.map(doc => {
    const path = join(resolve(projectRoot, 'docs'), doc.file)
    if (!existsSync(path)) {
      return {
        id: `doc-content-${doc.file}`,
        category: 'docs' as const,
        severity: 'warning' as GateSeverity,
        passed: false,
        message: `${doc.label} not found — cannot validate content`,
      }
    }
    const content = readFileSync(path, 'utf-8')
    const isPlaceholder = isPlaceholderDoc(content)
    const tooShort = content.length < doc.minContentLength

    const passed = !isPlaceholder && !tooShort
    return {
      id: `doc-content-${doc.file}`,
      category: 'docs' as const,
      severity: 'warning' as GateSeverity,
      passed,
      message: passed
        ? `${doc.label} has real content`
        : isPlaceholder
          ? `${doc.label} still contains placeholder text ("pendiente")`
          : `${doc.label} content too short (${content.length} chars, min ${doc.minContentLength})`,
      fix: `Edit docs/${doc.file} — replace placeholders with real project information`,
    }
  })
}

function checkPolicyExists(projectRoot: string): PreflightCheck {
  const path = resolve(projectRoot, CONTROL_DIR, 'policy.json')
  const exists = existsSync(path)
  return {
    id: 'policy-exists',
    category: 'policy',
    severity: 'error',
    passed: exists,
    message: exists ? 'Policy file present' : 'No policy.json found',
    fix: 'sp-devcontrol init',
  }
}

function checkProtectedPaths(projectRoot: string): PreflightCheck {
  const path = resolve(projectRoot, CONTROL_DIR, 'policy.json')
  if (!existsSync(path)) {
    return { id: 'policy-protected', category: 'policy', severity: 'warning', passed: false, message: 'Cannot check protected paths — policy missing' }
  }
  try {
    const policy = JSON.parse(readFileSync(path, 'utf-8'))
    const count = (policy.protectedPaths ?? []).length
    return {
      id: 'policy-protected',
      category: 'policy',
      severity: count > 0 ? 'info' : 'warning',
      passed: count > 0,
      message: count > 0 ? `${count} protected path patterns defined` : 'No protected paths defined',
      fix: 'sp-devcontrol policy:protected:add --pattern "src/auth/**"',
    }
  } catch {
    return { id: 'policy-protected', category: 'policy', severity: 'warning', passed: false, message: 'Policy file corrupted' }
  }
}

function checkStackDefined(projectRoot: string): PreflightCheck {
  if (!hasConfig(projectRoot)) {
    return { id: 'stack-defined', category: 'config', severity: 'warning', passed: false, message: 'Config missing — cannot check stack' }
  }
  try {
    const config = loadConfig(projectRoot)
    const defined = config.stack.length > 0
    return {
      id: 'stack-defined',
      category: 'config',
      severity: 'warning',
      passed: defined,
      message: defined ? `Stack: ${config.stack.join(', ')}` : 'Technology stack not defined in config',
      fix: 'Update .devcontrol/config.json — set "stack" to your authorized technologies',
    }
  } catch {
    return { id: 'stack-defined', category: 'config', severity: 'warning', passed: false, message: 'Config unreadable' }
  }
}

function checkNoOpenSessions(database: JsonDb): PreflightCheck {
  const sessions = listSessions(database, 10)
  const open = sessions.filter(s => s.status === 'active' || (!s.status && !s.endedAt))
  if (open.length > 0) {
    return {
      id: 'no-open-sessions',
      category: 'session',
      severity: 'warning',
      passed: false,
      message: `${open.length} open session(s): ${open.map(s => s.id).join(', ')}`,
      fix: `Close open sessions first: sp-devcontrol session:close --session ${open[0].id}`,
    }
  }
  return { id: 'no-open-sessions', category: 'session', severity: 'info', passed: true, message: 'No open sessions' }
}

export function renderPreflightResult(result: PreflightResult): string {
  const lines: string[] = []
  const phaseLabel = {
    uninitialized: chalk.red('UNINITIALIZED'),
    initialized: chalk.yellow('INITIALIZED (docs pending)'),
    designed: chalk.cyan('DESIGNED (ready for development)'),
    development: chalk.blue('IN DEVELOPMENT'),
    testing: chalk.magenta('TESTING'),
    release: chalk.green('RELEASE READY'),
  }

  lines.push(`${chalk.bold('Phase:')} ${phaseLabel[result.phase]}`)
  lines.push(`${chalk.bold('Status:')} ${result.passed ? chalk.green('READY') : chalk.red('BLOCKED')}`)
  lines.push('')

  const groups = new Map<string, PreflightCheck[]>()
  for (const check of result.checks) {
    const group = groups.get(check.category) ?? []
    group.push(check)
    groups.set(check.category, group)
  }

  for (const [category, checks] of groups) {
    lines.push(chalk.bold.underline(category.toUpperCase()))
    for (const check of checks) {
      const icon = check.passed ? chalk.green('✓') : check.severity === 'error' ? chalk.red('✖') : chalk.yellow('⚠')
      lines.push(`  ${icon} ${check.message}`)
      if (!check.passed && check.fix) {
        lines.push(chalk.gray(`    → ${check.fix}`))
      }
    }
    lines.push('')
  }

  if (result.blockers.length > 0) {
    lines.push(chalk.red.bold('BLOCKERS:'))
    for (const blocker of result.blockers) {
      lines.push(chalk.red(`  ✖ ${blocker}`))
    }
  }

  return lines.join('\n')
}
