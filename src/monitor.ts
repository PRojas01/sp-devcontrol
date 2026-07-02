/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'
import { analyzeChanges } from './analyzer.js'
import { SESSIONS_DIR, dateFolder } from './paths.js'
import { evaluatePathRisk } from './policy.js'
import { buildSessionReport, renderMarkdownReport } from './report.js'
import { generateChangeId } from './session.js'
import {
  getChangesForSession,
  insertChange,
  listApprovals,
  type JsonDb,
  updateSession,
} from './storage.js'
import { loadGates } from './gates.js'
import type {
  AnalysisResult,
  ApprovalRecord,
  ChangeSet,
  ControlViolation,
  DevSentinelConfig,
  FileChange,
  RiskLevel,
  Session,
} from './types.js'

export interface ProcessedBurst {
  change: ChangeSet
  analysis: AnalysisResult
  approvals: ApprovalRecord[]
  protectedMatches: string[]
  requiresApproval: boolean
}

export function processChangeBurst(
  projectRoot: string,
  database: JsonDb,
  session: Session,
  files: FileChange[],
  config: DevSentinelConfig,
): ProcessedBurst {
  // Gate enforcement: reject all changes if development gate is not open
  try {
    const gates = loadGates(projectRoot)
    const devGate = gates.gates['development']
    if (devGate && devGate.status !== 'open' && devGate.status !== 'pending') {
      const controlViolations: ControlViolation[] = [{
        controlId: 'gate-development-blocked',
        severity: 'error',
        message: `Development gate is ${devGate.status}: ${devGate.reason ?? 'blocked by human'}`,
      }]
      return {
        change: {
          id: '',
          sessionId: session.id,
          agent: session.agent,
          files,
          depsAdded: [],
          depsInvalid: [],
          riskLevel: 'HIGH',
          status: 'rejected',
          detectedAt: new Date().toISOString(),
          controlViolations,
        },
        analysis: { riskLevel: 'HIGH', depsAdded: [], depsInvalid: [], filesOutOfScope: [], deleteAttempts: [], warnings: ['Gate blocked'] },
        approvals: [],
        protectedMatches: [],
        requiresApproval: true,
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const warnPath = join(projectRoot, '.devcontrol', 'reports', `${session.id}-gate-errors.log`)
    appendFileSync(warnPath, `${new Date().toISOString()} gate-check: ${msg}\n`, 'utf-8')
  }

  // Hard token budget cap: reject changes if budget exceeded
  if (config.rules.hardTokenCap && session.tokenBudget && session.tokenEstimate !== undefined) {
    if (session.tokenEstimate >= session.tokenBudget) {
      const controlViolations: ControlViolation[] = [{
        controlId: 'token-budget-exceeded',
        severity: 'error',
        message: `Session token budget exhausted (${session.tokenEstimate}/${session.tokenBudget}). Start a new session.`,
      }]
      return {
        change: {
          id: '',
          sessionId: session.id,
          agent: session.agent,
          files,
          depsAdded: [],
          depsInvalid: [],
          riskLevel: 'HIGH',
          status: 'rejected',
          detectedAt: new Date().toISOString(),
          controlViolations,
        },
        analysis: { riskLevel: 'HIGH', depsAdded: [], depsInvalid: [], filesOutOfScope: [], deleteAttempts: [], warnings: ['Token budget exhausted'] },
        approvals: [],
        protectedMatches: [],
        requiresApproval: true,
      }
    }
  }

  const approvals = listApprovals(database, session.id)
  const analysis = analyzeChanges(files, config, projectRoot)
  const controlViolations: ControlViolation[] = []
  const protectedMatches: string[] = []

  for (const file of files) {
    const pathPolicy = evaluatePathRisk(projectRoot, file.filepath, approvals)
    if (pathPolicy.protected) {
      protectedMatches.push(file.filepath)
      if (!pathPolicy.approved) {
        controlViolations.push({
          controlId: 'policy-protected-path',
          severity: 'error',
          message: pathPolicy.reason,
          filepath: file.filepath,
        })
      } else {
        controlViolations.push({
          controlId: 'policy-protected-path-approved',
          severity: 'warning',
          message: pathPolicy.reason,
          filepath: file.filepath,
        })
      }
    }

    if (file.outOfScope) {
      controlViolations.push({
        controlId: 'policy-scope',
        severity: 'error',
        message: 'File is outside allowed scope',
        filepath: file.filepath,
      })
    }

    if (file.eventType === 'deleted_attempt') {
      controlViolations.push({
        controlId: 'policy-delete-attempt',
        severity: 'error',
        message: 'Deletion attempt blocked by watcher',
        filepath: file.filepath,
      })
    }
  }

  if (files.length > config.rules.maxFilesPerChange) {
    controlViolations.push({
      controlId: 'policy-max-files',
      severity: 'warning',
      message: `Burst changed ${files.length} files; limit is ${config.rules.maxFilesPerChange}`,
    })
  }

  for (const warning of analysis.warnings) {
    controlViolations.push({
      controlId: 'analysis-warning',
      severity: 'warning',
      message: warning,
    })
  }

  const riskLevel = mergeRisk(
    analysis.riskLevel,
    files,
    protectedMatches.length,
    controlViolations.some(item => item.severity === 'error'),
  )

  const changeId = generateChangeId(session.id, session.totalChanges + 1)
  const change: ChangeSet = {
    id: changeId,
    sessionId: session.id,
    agent: session.agent,
    files,
    depsAdded: analysis.depsAdded,
    depsInvalid: analysis.depsInvalid,
    riskLevel,
    status: 'pending',
    detectedAt: new Date().toISOString(),
    controlViolations,
  }

  insertChange(database, change)
  session.totalChanges += 1
  updateSession(database, session)
  persistWatcherArtifacts(projectRoot, session, database, change, analysis, protectedMatches)

  return {
    change,
    analysis,
    approvals,
    protectedMatches,
    requiresApproval: riskLevel !== 'LOW' || controlViolations.length > 0,
  }
}

export function renderBurstSummary(result: ProcessedBurst): string {
  const color = result.change.riskLevel === 'HIGH'
    ? chalk.red
    : result.change.riskLevel === 'MEDIUM'
      ? chalk.yellow
      : chalk.green

  const lines = [
    `${chalk.bold('Change:')} ${result.change.id}`,
    `${chalk.bold('Risk:')} ${color(result.change.riskLevel)}`,
    `${chalk.bold('Files:')} ${result.change.files.length}`,
    `${chalk.bold('Protected:')} ${result.protectedMatches.length}`,
    `${chalk.bold('Approval required:')} ${result.requiresApproval ? 'yes' : 'no'}`,
  ]

  if (result.analysis.warnings.length > 0) {
    lines.push(`${chalk.bold('Warnings:')} ${result.analysis.warnings.join(' | ')}`)
  }

  return lines.join('\n')
}

function mergeRisk(
  baseRisk: RiskLevel,
  files: FileChange[],
  protectedMatches: number,
  hasErrors: boolean,
): RiskLevel {
  if (hasErrors) return 'HIGH'
  if (protectedMatches > 0) return baseRisk === 'LOW' ? 'MEDIUM' : 'HIGH'
  if (files.length > 5 && baseRisk === 'LOW') return 'MEDIUM'
  return baseRisk
}

function persistWatcherArtifacts(
  projectRoot: string,
  session: Session,
  database: JsonDb,
  change: ChangeSet,
  analysis: AnalysisResult,
  protectedMatches: string[],
): void {
  const baseDir = resolve(projectRoot, join(SESSIONS_DIR, dateFolder(new Date(session.startedAt))))
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true })

  const auditPath = join(baseDir, `${session.id}-audit.jsonl`)
  appendFileSync(auditPath, `${JSON.stringify({
    time: new Date().toISOString(),
    session: session.id,
    action: 'change_detected',
    changeId: change.id,
    riskLevel: change.riskLevel,
    fileCount: change.files.length,
    protectedMatches,
    warnings: analysis.warnings,
  })}\n`, 'utf-8')

  const diffSummaryPath = join(baseDir, `${session.id}-diff-summary.md`)
  const diffSummary = [
    '# Diff Summary',
    '',
    `## Last change: ${change.id}`,
    `- risk: ${change.riskLevel}`,
    `- files: ${change.files.length}`,
    `- protected matches: ${protectedMatches.length}`,
    `- warnings: ${analysis.warnings.length > 0 ? analysis.warnings.join('; ') : 'none'}`,
    '',
    '## Files',
    ...change.files.map(file => `- ${file.filepath} (${file.eventType}) +${file.linesAdded}/-${file.linesRemoved}`),
  ].join('\n')
  writeFileSync(diffSummaryPath, diffSummary, 'utf-8')

  const reportPath = join(projectRoot, '.devcontrol', 'reports', `${session.id}-report.md`)
  const report = buildSessionReport(session, getChangesForSession(database, session.id))
  const reportContent = renderMarkdownReport(report)
  const reportDir = resolve(projectRoot, '.devcontrol', 'reports')
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
  writeFileSync(reportPath, reportContent, 'utf-8')
}
