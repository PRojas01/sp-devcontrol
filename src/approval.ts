import chalk from 'chalk'
import boxen from 'boxen'
import inquirer from 'inquirer'
import type { ChangeSet, FileChange, AnalysisResult, ApprovalDecision, DevSentinelConfig, ValidationResult } from './types.js'
import { renderFileDiff } from './diff.js'
import { renderValidationResult } from './validator.js'

const RISK_COLORS: Record<string, (s: string) => string> = {
  LOW: chalk.green,
  MEDIUM: chalk.yellow,
  HIGH: chalk.red,
}

export async function runApprovalFlow(
  change: ChangeSet,
  analysis: AnalysisResult,
  validation: ValidationResult,
  config: DevSentinelConfig,
): Promise<ApprovalDecision> {
  console.clear()

  // Step 0: Controls Validation
  await showControlsValidation(validation)

  const hasBlockingErrors = validation.errors.length > 0 && hasBlockingControls(validation, config)
  if (hasBlockingErrors) {
    console.log(chalk.red.bold('\n✖ BLOCKED: Critical control violations require rejection'))
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
      type: 'confirm',
      name: 'confirm',
      message: 'Automatically reject due to critical violations?',
      default: true,
    }])
    if (confirm) return { action: 'reject', message: 'Auto-rejected: critical control violations' }
  }

  // Step 1: Impact panel
  showImpactPanel(change, analysis)

  // Step 2: Analysis detail
  showAnalysisDetail(analysis)

  const proceed = await askProceed()
  if (!proceed) return { action: 'reject', message: 'Rejected after impact review' }

  // Step 3: File diffs
  await showDiffs(change.files)

  // Step 4: Decision
  return askDecision(change, config)
}

async function showControlsValidation(validation: ValidationResult): Promise<void> {
  const statusLine = validation.passed
    ? chalk.green.bold('✓ PASSED')
    : chalk.red.bold(`✖ ${validation.errors.length} ERRORS · ${validation.warnings.length} WARNINGS`)

  const content = [
    `${chalk.bold('Controls Validation')}   ${statusLine}`,
    '',
    renderValidationResult(validation),
  ].join('\n')

  console.log(boxen(content, {
    title: chalk.cyan('[ Step 0 — Controls ]'),
    titleAlignment: 'left',
    padding: 1,
    borderColor: validation.passed ? 'green' : 'red',
  }))
  console.log()
}

function showImpactPanel(change: ChangeSet, analysis: AnalysisResult): void {
  const riskColor = RISK_COLORS[change.riskLevel] ?? chalk.white
  const deleteCount = change.files.filter(f => f.eventType === 'deleted_attempt').length
  const modifiedCount = change.files.filter(f => f.eventType === 'modified').length
  const addedCount = change.files.filter(f => f.eventType === 'added').length
  const totalAdded = change.files.reduce((s, f) => s + f.linesAdded, 0)
  const totalRemoved = change.files.reduce((s, f) => s + f.linesRemoved, 0)
  const outOfScope = change.files.filter(f => f.outOfScope).length

  const rows = [
    `  ${chalk.bold('Agent:')}         ${chalk.cyan(change.agent)}`,
    `  ${chalk.bold('Change ID:')}     ${chalk.cyan(change.id)}`,
    `  ${chalk.bold('Risk level:')}    ${riskColor(change.riskLevel)}`,
    '',
    `  ${chalk.bold('Files modified:')}  ${chalk.white(modifiedCount)}`,
    `  ${chalk.bold('Files added:')}     ${chalk.green(addedCount)}`,
    deleteCount > 0
      ? `  ${chalk.bold('Delete attempts:')} ${chalk.red.bold(deleteCount + ' ⚠ BLOCKED')}`
      : `  ${chalk.bold('Delete attempts:')} ${chalk.gray('0')}`,
    outOfScope > 0
      ? `  ${chalk.bold('Out of scope:')}    ${chalk.red.bold(outOfScope + ' ⚠')}`
      : `  ${chalk.bold('Out of scope:')}    ${chalk.gray('0')}`,
    '',
    `  ${chalk.bold('Lines:')}         ${chalk.green('+' + totalAdded)} / ${chalk.red('-' + totalRemoved)}`,
    change.depsAdded.length > 0
      ? `  ${chalk.bold('Deps added:')}    ${chalk.yellow(change.depsAdded.join(', '))}`
      : '',
    change.depsInvalid.length > 0
      ? `  ${chalk.bold('Deps invalid:')} ${chalk.red(change.depsInvalid.join(', '))}`
      : '',
  ].filter(Boolean).join('\n')

  console.log(boxen(rows, {
    title: chalk.cyan('[ Step 1 — Impact ]'),
    titleAlignment: 'left',
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderColor: 'cyan',
  }))
  console.log()
}

function showAnalysisDetail(analysis: AnalysisResult): void {
  if (analysis.warnings.length === 0 && analysis.deleteAttempts.length === 0 && analysis.filesOutOfScope.length === 0) {
    console.log(chalk.green('  ✓ Static analysis passed — no issues detected\n'))
    return
  }

  const lines: string[] = []

  if (analysis.deleteAttempts.length > 0) {
    lines.push(chalk.red.bold('  Delete attempts BLOCKED:'))
    for (const f of analysis.deleteAttempts) lines.push(chalk.red(`    ✖ ${f}`))
    lines.push('')
  }

  if (analysis.filesOutOfScope.length > 0) {
    lines.push(chalk.red.bold('  Files outside authorized scope:'))
    for (const f of analysis.filesOutOfScope) lines.push(chalk.red(`    ⚠ ${f}`))
    lines.push('')
  }

  if (analysis.warnings.length > 0) {
    lines.push(chalk.yellow('  Warnings:'))
    for (const w of analysis.warnings) lines.push(chalk.yellow(`    • ${w}`))
  }

  console.log(boxen(lines.join('\n'), {
    title: chalk.cyan('[ Step 2 — Analysis ]'),
    titleAlignment: 'left',
    padding: 1,
    borderColor: 'yellow',
  }))
  console.log()
}

async function askProceed(): Promise<boolean> {
  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([{
    type: 'confirm',
    name: 'proceed',
    message: 'Continue to file diffs?',
    default: true,
  }])
  return proceed
}

async function showDiffs(files: FileChange[]): Promise<void> {
  const nonDeleted = files.filter(f => f.eventType !== 'deleted_attempt')
  if (nonDeleted.length === 0) {
    console.log(chalk.gray('  No file diffs to show\n'))
    return
  }

  console.log(chalk.cyan.bold('\n[ Step 3 — Diffs ]\n'))

  const PER_PAGE = 3
  for (let i = 0; i < nonDeleted.length; i += PER_PAGE) {
    const batch = nonDeleted.slice(i, i + PER_PAGE)
    for (const file of batch) {
      console.log(renderFileDiff(file.filepath, file.diffContent))
    }

    if (i + PER_PAGE < nonDeleted.length) {
      const { next } = await inquirer.prompt<{ next: boolean }>([{
        type: 'confirm',
        name: 'next',
        message: `Show next ${Math.min(PER_PAGE, nonDeleted.length - i - PER_PAGE)} files?`,
        default: true,
      }])
      if (!next) break
    }
  }
  console.log()
}

async function askDecision(change: ChangeSet, _config: DevSentinelConfig): Promise<ApprovalDecision> {
  const choices = [
    { name: chalk.green('[a] Approve all changes'), value: 'approve' },
    { name: chalk.red('[r] Reject all changes'), value: 'reject' },
    { name: chalk.yellow('[f] Approve file by file (partial)'), value: 'partial' },
  ]

  console.log(boxen(chalk.bold('What do you want to do with these changes?'), {
    title: chalk.cyan('[ Step 4 — Decision ]'),
    titleAlignment: 'left',
    padding: 1,
    borderColor: 'cyan',
  }))

  const { action } = await inquirer.prompt<{ action: string }>([{
    type: 'list',
    name: 'action',
    message: 'Choose action:',
    choices,
  }])

  if (action === 'approve') {
    return { action: 'approve' }
  }

  if (action === 'reject') {
    const { message } = await inquirer.prompt<{ message: string }>([{
      type: 'input',
      name: 'message',
      message: 'Rejection reason (optional):',
    }])
    return { action: 'reject', message: message || undefined }
  }

  // Partial: file by file
  const nonDeleted = change.files.filter(f => f.eventType !== 'deleted_attempt')
  const approvedFiles: string[] = []

  for (const file of nonDeleted) {
    console.log(renderFileDiff(file.filepath, file.diffContent))
    const { approve } = await inquirer.prompt<{ approve: boolean }>([{
      type: 'confirm',
      name: 'approve',
      message: `Approve ${file.filepath}?`,
      default: true,
    }])
    if (approve) approvedFiles.push(file.filepath)
  }

  if (approvedFiles.length === 0) return { action: 'reject', message: 'No files approved' }
  if (approvedFiles.length === nonDeleted.length) return { action: 'approve' }
  return { action: 'approve_partial', approvedFiles }
}

function hasBlockingControls(validation: ValidationResult, _config: DevSentinelConfig): boolean {
  const blockingIds = new Set(['sec-secrets', 'sec-cmd', 'priv-pii', 'priv-files', 'skill-bash', 'skill-scope', 'mem-scan', 'mem-context'])
  return validation.errors.some(v => blockingIds.has(v.controlId))
}
