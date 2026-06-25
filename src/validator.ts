import { existsSync, readFileSync } from 'fs'
import chalk from 'chalk'
import type { FileChange, DevSentinelConfig, ValidationResult, ControlViolation, MemoryScanResult } from './types.js'
import { getActiveControls } from './catalog/controls.js'

export function validateChangeset(files: FileChange[], config: DevSentinelConfig): ValidationResult {
  const activeControls = getActiveControls(config)
  const violations: ControlViolation[] = []

  for (const control of activeControls) {
    if (!control.validator) continue
    const result = control.validator(files, config)
    violations.push(...result)
  }

  const errors = violations.filter(v => v.severity === 'error')
  const warnings = violations.filter(v => v.severity === 'warning')
  const passed = errors.length === 0

  return { passed, violations, errors, warnings }
}

export function renderValidationResult(result: ValidationResult): string {
  if (result.violations.length === 0) {
    return chalk.green('  ✓ All active controls passed — no violations found')
  }

  const lines: string[] = []

  if (result.errors.length > 0) {
    lines.push(chalk.red(`  ✖ ${result.errors.length} error(s):`))
    for (const v of result.errors) {
      const location = v.filepath ? chalk.gray(` [${v.filepath}${v.line !== undefined ? `:${v.line}` : ''}]`) : ''
      lines.push(chalk.red(`    • [${v.controlId}] ${v.message}`) + location)
    }
  }

  if (result.warnings.length > 0) {
    lines.push(chalk.yellow(`  ⚠ ${result.warnings.length} warning(s):`))
    for (const v of result.warnings) {
      const location = v.filepath ? chalk.gray(` [${v.filepath}${v.line !== undefined ? `:${v.line}` : ''}]`) : ''
      lines.push(chalk.yellow(`    • [${v.controlId}] ${v.message}`) + location)
    }
  }

  return lines.join('\n')
}

export function hasBlockingViolations(result: ValidationResult, config: DevSentinelConfig): boolean {
  const blockControls = new Set(
    getActiveControls(config).filter(c => c.mode === 'block').map(c => c.id),
  )
  return result.errors.some(v => blockControls.has(v.controlId))
}

export function scanMemoryFiles(memoryPaths: string[]): MemoryScanResult {
  const findings: MemoryScanResult['findings'] = []

  const SECRET_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /ghp_[a-zA-Z0-9]{36}/,
    /password\s*=\s*["'][^"']{3,}["']/i,
    /api[_-]?key\s*[=:]\s*["'][a-zA-Z0-9_\-]{8,}["']/i,
  ]
  const PII_PATTERNS = [
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b(?!.*example\.com)/,
    /\b\d{3}-\d{2}-\d{4}\b/,
  ]

  for (const filePath of memoryPaths) {
    if (!existsSync(filePath)) continue
    const lines = readFileSync(filePath, 'utf-8').split('\n')
    lines.forEach((line, idx) => {
      for (const p of SECRET_PATTERNS) {
        if (p.test(line)) {
          findings.push({ file: filePath, type: 'secret', match: line.slice(0, 80), line: idx + 1 })
        }
      }
      for (const p of PII_PATTERNS) {
        if (p.test(line)) {
          findings.push({ file: filePath, type: 'pii', match: line.slice(0, 80), line: idx + 1 })
        }
      }
    })
  }

  return {
    hasSecrets: findings.some(f => f.type === 'secret'),
    hasPii: findings.some(f => f.type === 'pii'),
    findings,
  }
}

export function redactSecretsFromContent(content: string): string {
  const patterns = [
    { pattern: /(sk-[a-zA-Z0-9]{20,})/, replacement: '[REDACTED_KEY]' },
    { pattern: /(AKIA[0-9A-Z]{16})/, replacement: '[REDACTED_AWS_KEY]' },
    { pattern: /(ghp_[a-zA-Z0-9]{36})/, replacement: '[REDACTED_GH_TOKEN]' },
    { pattern: /(password\s*=\s*["'])[^"']{3,}(["'])/i, replacement: '$1[REDACTED]$2' },
    { pattern: /(api[_-]?key\s*[=:]\s*["'])[a-zA-Z0-9_\-]{8,}(["'])/i, replacement: '$1[REDACTED]$2' },
    { pattern: /(Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/i, replacement: '$1[REDACTED_TOKEN]' },
  ]
  let result = content
  for (const { pattern, replacement } of patterns) {
    result = result.replace(new RegExp(pattern, 'g'), replacement as string)
  }
  return result
}
