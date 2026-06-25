/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { mkdtempSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { DB_PATH } from '../src/paths.js'
import {
  closeDb,
  getDb,
  insertSession,
  insertChange,
  insertApproval,
  insertSnapshot,
} from '../src/storage.js'
import { initializeControlledProject } from '../src/project_init.js'
import { generateComplianceReport } from '../src/compliance.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-compliance-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

describe('compliance report', () => {
  it('generates a report with session and change data', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test-project' })
    const db = getDb(resolve(dir, DB_PATH))

    insertSession(db, {
      id: 'session-1',
      project: 'test-project',
      agent: 'test-agent',
      mode: 'watch',
      startedAt: '2026-06-01T10:00:00.000Z',
      totalChanges: 0,
      approved: 0,
      rejected: 0,
      objective: 'Add login feature',
      status: 'completed',
      endedAt: '2026-06-01T12:00:00.000Z',
    })

    insertChange(db, {
      id: 'change-1',
      sessionId: 'session-1',
      agent: 'test-agent',
      files: [],
      depsAdded: [],
      depsInvalid: [],
      riskLevel: 'HIGH',
      status: 'approved',
      detectedAt: '2026-06-01T11:00:00.000Z',
      controlViolations: [
        { controlId: 'sec-secrets', severity: 'error', message: 'Hardcoded secret detected', filepath: 'src/config.ts' },
      ],
    })

    insertChange(db, {
      id: 'change-2',
      sessionId: 'session-1',
      agent: 'test-agent',
      files: [],
      depsAdded: [],
      depsInvalid: [],
      riskLevel: 'LOW',
      status: 'pending',
      detectedAt: '2026-06-01T11:30:00.000Z',
      controlViolations: [],
    })

    const report = generateComplianceReport(dir, db)

    expect(report.projectName).toBe('test-project')
    expect(report.summary.totalSessions).toBe(1)
    expect(report.summary.totalChanges).toBe(2)
    expect(report.summary.totalApproved).toBe(1)
    expect(report.summary.totalPending).toBe(1)
    expect(report.summary.totalHighRisk).toBe(1)
    expect(report.summary.totalViolations).toBe(1)

    expect(report.sessions).toHaveLength(1)
    expect(report.sessions[0].sessionId).toBe('session-1')
    expect(report.sessions[0].objective).toBe('Add login feature')
    expect(report.sessions[0].status).toBe('completed')

    const secSecrets = report.controls.find(c => c.controlId === 'sec-secrets')
    expect(secSecrets).toBeDefined()
    expect(secSecrets!.violationsFound).toBe(1)
    expect(secSecrets!.sessionsChecked).toBe(1)

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('maps controls to OWASP, RGPD, ISO 27001, CWE, and SLSA norms', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'norms-test' })
    const db = getDb(resolve(dir, DB_PATH))

    const report = generateComplianceReport(dir, db)

    const allNorms = report.summary.normsReferenced
    const joined = allNorms.join(' ')

    expect(joined).toContain('OWASP')
    expect(joined).toContain('CWE')
    expect(joined).toContain('RGPD')
    expect(joined).toContain('ISO')

    // Check specific controls reference expected norms
    const secSecrets = report.controls.find(c => c.controlId === 'sec-secrets')
    expect(secSecrets).toBeDefined()
    expect(secSecrets!.norms).toContain('OWASP A02:2021 — Cryptographic Failures')
    expect(secSecrets!.norms).toContain('CWE-798')

    const privPii = report.controls.find(c => c.controlId === 'priv-pii')
    expect(privPii).toBeDefined()
    expect(privPii!.norms.some(n => n.includes('RGPD'))).toBe(true)

    const memScan = report.controls.find(c => c.controlId === 'mem-scan')
    expect(memScan).toBeDefined()
    expect(memScan!.norms.some(n => n.includes('ISO 27001'))).toBe(true)

    const secDeps = report.controls.find(c => c.controlId === 'sec-deps')
    expect(secDeps).toBeDefined()
    expect(secDeps!.norms.some(n => n.includes('SLSA'))).toBe(true)

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('filters active controls based on project config', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'active-controls-test' })
    const db = getDb(resolve(dir, DB_PATH))

    const report = generateComplianceReport(dir, db)

    const activeControls = report.controls.filter(c => c.active)
    const inactiveControls = report.controls.filter(c => !c.active)

    expect(activeControls.length).toBeGreaterThan(0)
    expect(activeControls.length).toBeLessThan(report.summary.totalControls)
    expect(activeControls.length).toBe(report.summary.activeControls)

    // All controls in the catalog should appear in the report
    expect(report.controls.length).toBe(report.summary.totalControls)

    // Active controls should have their IDs listed in the config categories
    for (const c of activeControls) {
      expect(c.mode).toBeTruthy()
    }

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('generates a report for an empty project with no sessions or changes', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'empty-project' })
    const db = getDb(resolve(dir, DB_PATH))

    const report = generateComplianceReport(dir, db)

    expect(report.projectName).toBe('empty-project')
    expect(report.summary.totalSessions).toBe(0)
    expect(report.summary.totalChanges).toBe(0)
    expect(report.summary.totalApproved).toBe(0)
    expect(report.summary.totalRejected).toBe(0)
    expect(report.summary.totalPending).toBe(0)
    expect(report.summary.totalHighRisk).toBe(0)
    expect(report.summary.totalViolations).toBe(0)

    expect(report.sessions).toHaveLength(0)

    // Controls should still be populated from the catalog
    expect(report.controls.length).toBeGreaterThan(0)
    expect(report.controls.length).toBe(report.summary.totalControls)

    // Every control should have zero violations and sessions checked
    for (const c of report.controls) {
      expect(c.violationsFound).toBe(0)
      expect(c.sessionsChecked).toBe(0)
    }

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('counts violations across multiple sessions and controls', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'violations-test' })
    const db = getDb(resolve(dir, DB_PATH))

    insertSession(db, {
      id: 'session-v1',
      project: 'violations-test',
      agent: 'test-agent',
      mode: 'watch',
      startedAt: '2026-06-01T10:00:00.000Z',
      totalChanges: 0,
      approved: 0,
      rejected: 0,
      objective: 'Fix auth',
      status: 'completed',
    })

    insertSession(db, {
      id: 'session-v2',
      project: 'violations-test',
      agent: 'test-agent',
      mode: 'watch',
      startedAt: '2026-06-02T10:00:00.000Z',
      totalChanges: 0,
      approved: 0,
      rejected: 0,
      objective: 'Add payment',
    })

    // Session 1: two changes with violations
    insertChange(db, {
      id: 'change-v1a',
      sessionId: 'session-v1',
      agent: 'test-agent',
      files: [],
      depsAdded: [],
      depsInvalid: [],
      riskLevel: 'HIGH',
      status: 'rejected',
      detectedAt: '2026-06-01T11:00:00.000Z',
      controlViolations: [
        { controlId: 'sec-secrets', severity: 'error', message: 'API key in code', filepath: 'src/auth.ts' },
        { controlId: 'sec-sqli', severity: 'error', message: 'SQL injection risk', filepath: 'src/db.ts' },
      ],
    })

    insertChange(db, {
      id: 'change-v1b',
      sessionId: 'session-v1',
      agent: 'test-agent',
      files: [],
      depsAdded: [],
      depsInvalid: [],
      riskLevel: 'MEDIUM',
      status: 'approved',
      detectedAt: '2026-06-01T12:00:00.000Z',
      controlViolations: [
        { controlId: 'priv-logging', severity: 'warning', message: 'PII in log', filepath: 'src/logger.ts' },
      ],
    })

    // Session 2: one change with violations
    insertChange(db, {
      id: 'change-v2a',
      sessionId: 'session-v2',
      agent: 'test-agent',
      files: [],
      depsAdded: [],
      depsInvalid: [],
      riskLevel: 'HIGH',
      status: 'pending',
      detectedAt: '2026-06-02T11:00:00.000Z',
      controlViolations: [
        { controlId: 'sec-secrets', severity: 'error', message: 'Another secret', filepath: 'src/config.ts' },
        { controlId: 'sec-cmd', severity: 'error', message: 'Command injection', filepath: 'src/exec.ts' },
        { controlId: 'sec-xss', severity: 'warning', message: 'XSS risk', filepath: 'src/view.tsx' },
      ],
    })

    const report = generateComplianceReport(dir, db)

    // Summary checks
    expect(report.summary.totalSessions).toBe(2)
    expect(report.summary.totalChanges).toBe(3)
    expect(report.summary.totalViolations).toBe(6)
    expect(report.summary.totalApproved).toBe(1)
    expect(report.summary.totalRejected).toBe(1)
    expect(report.summary.totalPending).toBe(1)
    expect(report.summary.totalHighRisk).toBe(2)

    // Per-control violation counts
    const secSecrets = report.controls.find(c => c.controlId === 'sec-secrets')
    expect(secSecrets!.violationsFound).toBe(2)

    const secSqli = report.controls.find(c => c.controlId === 'sec-sqli')
    expect(secSqli!.violationsFound).toBe(1)

    const privLogging = report.controls.find(c => c.controlId === 'priv-logging')
    expect(privLogging!.violationsFound).toBe(1)

    const secCmd = report.controls.find(c => c.controlId === 'sec-cmd')
    expect(secCmd!.violationsFound).toBe(1)

    const secXss = report.controls.find(c => c.controlId === 'sec-xss')
    expect(secXss!.violationsFound).toBe(1)

    // Per-session summaries
    expect(report.sessions).toHaveLength(2)

    const s1 = report.sessions.find(s => s.sessionId === 'session-v1')
    expect(s1).toBeDefined()
    expect(s1!.changesTotal).toBe(2)
    expect(s1!.violationsTotal).toBe(3)
    expect(s1!.approved).toBe(1)
    expect(s1!.rejected).toBe(1)
    expect(s1!.highRisk).toBe(1)
    expect(s1!.status).toBe('completed')

    const s2 = report.sessions.find(s => s.sessionId === 'session-v2')
    expect(s2).toBeDefined()
    expect(s2!.changesTotal).toBe(1)
    expect(s2!.violationsTotal).toBe(3)
    expect(s2!.pending).toBe(1)
    expect(s2!.highRisk).toBe(1)
    expect(s2!.status).toBe('active')

    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
