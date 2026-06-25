/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { VERSION } from './version.js'
import { CONTROLS_CATALOG, getActiveControls } from './catalog/controls.js'
import { loadConfig } from './config.js'
import { checkHooksInstalled } from './hooks.js'
import { detectProjectPhase, runPreflightChecks } from './preflight.js'
import type { JsonDb } from './storage.js'
import { getChangesForSession, listSessions, listApprovals, listSnapshots } from './storage.js'
import type { DevSentinelConfig, ChangeSet, Session } from './types.js'

export interface ComplianceControlEntry {
  controlId: string
  controlName: string
  category: string
  mode: string
  norms: string[]
  active: boolean
  hasValidator: boolean
  sessionsChecked: number
  violationsFound: number
  lastChecked?: string
}

export interface ComplianceSessionSummary {
  sessionId: string
  objective: string
  status: string
  changesTotal: number
  approved: number
  rejected: number
  pending: number
  highRisk: number
  violationsTotal: number
  approvalsGranted: number
  snapshotsCreated: number
}

export interface ComplianceReport {
  projectName: string
  generatedAt: string
  phase: string
  controls: ComplianceControlEntry[]
  sessions: ComplianceSessionSummary[]
  hooks: { installed: string[]; missing: string[] }
  preflight: { passed: boolean; errors: number; warnings: number }
  summary: {
    totalControls: number
    activeControls: number
    controlsWithValidators: number
    controlsInjectOnly: number
    totalSessions: number
    totalChanges: number
    totalApproved: number
    totalRejected: number
    totalPending: number
    totalHighRisk: number
    totalViolations: number
    normsReferenced: string[]
  }
}

function extractNorms(normField: string): string[] {
  return normField.split(/[·,;]/).map(n => n.trim()).filter(Boolean)
}

export function generateComplianceReport(projectRoot: string, database: JsonDb): ComplianceReport {
  const config = loadConfig(projectRoot)
  const activeControls = getActiveControls(config)
  const activeIds = new Set(activeControls.map(c => c.id))
  const sessions = listSessions(database, 100)
  const hooks = checkHooksInstalled(projectRoot)
  const preflight = runPreflightChecks(projectRoot, database)
  const phase = detectProjectPhase(projectRoot, database)

  const sessionViolationCounts = new Map<string, number>()
  const controlViolationCounts = new Map<string, number>()
  const controlSessionCounts = new Map<string, number>()
  const controlLastChecked = new Map<string, string>()

  const sessionSummaries: ComplianceSessionSummary[] = []

  for (const session of sessions) {
    const changes = getChangesForSession(database, session.id)
    const approvals = listApprovals(database, session.id, false)
    const snapshots = listSnapshots(database, session.id)

    let violationsTotal = 0
    let highRisk = 0
    let approved = 0
    let rejected = 0
    let pending = 0

    for (const change of changes) {
      violationsTotal += change.controlViolations.length
      if (change.riskLevel === 'HIGH') highRisk++
      if (change.status === 'approved') approved++
      else if (change.status === 'rejected') rejected++
      else pending++

      for (const v of change.controlViolations) {
        controlViolationCounts.set(v.controlId, (controlViolationCounts.get(v.controlId) ?? 0) + 1)
        controlSessionCounts.set(v.controlId, (controlSessionCounts.get(v.controlId) ?? 0) + 1)
        const existing = controlLastChecked.get(v.controlId)
        if (!existing || change.detectedAt > existing) {
          controlLastChecked.set(v.controlId, change.detectedAt)
        }
      }
    }

    sessionViolationCounts.set(session.id, violationsTotal)

    sessionSummaries.push({
      sessionId: session.id,
      objective: session.objective ?? '',
      status: session.status ?? (session.endedAt ? 'completed' : 'active'),
      changesTotal: changes.length,
      approved,
      rejected,
      pending,
      highRisk,
      violationsTotal,
      approvalsGranted: approvals.length,
      snapshotsCreated: snapshots.length,
    })
  }

  const controls: ComplianceControlEntry[] = CONTROLS_CATALOG.map(c => ({
    controlId: c.id,
    controlName: c.name,
    category: c.category,
    mode: c.mode,
    norms: extractNorms(c.norm),
    active: activeIds.has(c.id),
    hasValidator: Boolean(c.validator),
    sessionsChecked: controlSessionCounts.get(c.id) ?? 0,
    violationsFound: controlViolationCounts.get(c.id) ?? 0,
    lastChecked: controlLastChecked.get(c.id),
  }))

  const allNorms = [...new Set(controls.flatMap(c => c.norms))].sort()

  const totalChanges = sessionSummaries.reduce((s, ss) => s + ss.changesTotal, 0)
  const totalApproved = sessionSummaries.reduce((s, ss) => s + ss.approved, 0)
  const totalRejected = sessionSummaries.reduce((s, ss) => s + ss.rejected, 0)
  const totalPending = sessionSummaries.reduce((s, ss) => s + ss.pending, 0)
  const totalHighRisk = sessionSummaries.reduce((s, ss) => s + ss.highRisk, 0)
  const totalViolations = sessionSummaries.reduce((s, ss) => s + ss.violationsTotal, 0)

  return {
    projectName: config.project,
    generatedAt: new Date().toISOString(),
    phase,
    controls,
    sessions: sessionSummaries,
    hooks,
    preflight: { passed: preflight.passed, errors: preflight.errors.length, warnings: preflight.warnings.length },
    summary: {
      totalControls: CONTROLS_CATALOG.length,
      activeControls: activeControls.length,
      controlsWithValidators: activeControls.filter(c => c.validator).length,
      controlsInjectOnly: activeControls.filter(c => c.mode === 'inject').length,
      totalSessions: sessions.length,
      totalChanges,
      totalApproved,
      totalRejected,
      totalPending,
      totalHighRisk,
      totalViolations,
      normsReferenced: allNorms,
    },
  }
}

export function renderComplianceMarkdown(report: ComplianceReport): string {
  const { summary: s } = report
  const lines: string[] = []

  lines.push(`# SP-DevControl — Compliance Report`)
  lines.push(``)
  lines.push(`**Project:** ${report.projectName}`)
  lines.push(`**Generated:** ${report.generatedAt}`)
  lines.push(`**Phase:** ${report.phase}`)
  lines.push(`**Preflight:** ${report.preflight.passed ? 'PASSED' : `BLOCKED (${report.preflight.errors} errors, ${report.preflight.warnings} warnings)`}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Summary`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|---|---|`)
  lines.push(`| Total controls in catalog | ${s.totalControls} |`)
  lines.push(`| Active controls | ${s.activeControls} |`)
  lines.push(`| Controls with validators | ${s.controlsWithValidators} |`)
  lines.push(`| Controls inject-only | ${s.controlsInjectOnly} |`)
  lines.push(`| Sessions tracked | ${s.totalSessions} |`)
  lines.push(`| Changes detected | ${s.totalChanges} |`)
  lines.push(`| Approved | ${s.totalApproved} |`)
  lines.push(`| Rejected | ${s.totalRejected} |`)
  lines.push(`| Pending | ${s.totalPending} |`)
  lines.push(`| HIGH risk | ${s.totalHighRisk} |`)
  lines.push(`| Violations detected | ${s.totalViolations} |`)
  lines.push(``)

  lines.push(`## Git Hooks`)
  lines.push(``)
  lines.push(`| Hook | Status |`)
  lines.push(`|---|---|`)
  for (const h of report.hooks.installed) lines.push(`| ${h} | Installed |`)
  for (const h of report.hooks.missing) lines.push(`| ${h} | Missing |`)
  lines.push(``)

  lines.push(`## Norms Referenced`)
  lines.push(``)
  for (const norm of s.normsReferenced) lines.push(`- ${norm}`)
  lines.push(``)

  lines.push(`## Controls Detail`)
  lines.push(``)
  lines.push(`| ID | Name | Category | Mode | Active | Validator | Violations |`)
  lines.push(`|---|---|---|---|---|---|---|`)
  for (const c of report.controls) {
    lines.push(`| ${c.controlId} | ${c.controlName} | ${c.category} | ${c.mode} | ${c.active ? 'Yes' : 'No'} | ${c.hasValidator ? 'Yes' : 'No'} | ${c.violationsFound} |`)
  }
  lines.push(``)

  if (report.sessions.length > 0) {
    lines.push(`## Sessions`)
    lines.push(``)
    lines.push(`| Session | Status | Changes | Approved | Rejected | Pending | HIGH | Violations |`)
    lines.push(`|---|---|---|---|---|---|---|---|`)
    for (const ss of report.sessions) {
      lines.push(`| ${ss.sessionId} | ${ss.status} | ${ss.changesTotal} | ${ss.approved} | ${ss.rejected} | ${ss.pending} | ${ss.highRisk} | ${ss.violationsTotal} |`)
    }
    lines.push(``)
  }

  lines.push(`---`)
  lines.push(`_Generated by SP-DevControl ${VERSION} · ${report.generatedAt}_`)
  return lines.join('\n')
}
