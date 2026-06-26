/**
 * SP-DevControl v2.0.0
 * Human Authorization Gates — explicit human sign-off per project phase
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro
 * MIT License
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { CONTROL_DIR } from './paths.js'

export type GatePhase = 'design' | 'development' | 'review' | 'publish'
export type GateStatus = 'pending' | 'open' | 'blocked'

export interface GateRecord {
  phase: GatePhase
  status: GateStatus
  updatedAt: string
  approvedBy?: string
  notes?: string
  reason?: string
}

export interface GatesFile {
  projectName: string
  updatedAt: string
  gates: Record<GatePhase, GateRecord>
}

const PHASES: GatePhase[] = ['design', 'development', 'review', 'publish']

function gatesPath(projectRoot: string): string {
  return resolve(projectRoot, CONTROL_DIR, 'gates.json')
}

function defaultGates(projectName = 'project'): GatesFile {
  const now = new Date().toISOString()
  const gates = {} as Record<GatePhase, GateRecord>
  for (const phase of PHASES) {
    gates[phase] = { phase, status: 'pending', updatedAt: now }
  }
  return { projectName, updatedAt: now, gates }
}

export function loadGates(projectRoot: string): GatesFile {
  const path = gatesPath(projectRoot)
  if (!existsSync(path)) return defaultGates()
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as GatesFile
    // ensure all phases present (forward compat)
    for (const phase of PHASES) {
      if (!parsed.gates[phase]) {
        parsed.gates[phase] = { phase, status: 'pending', updatedAt: new Date().toISOString() }
      }
    }
    return parsed
  } catch {
    return defaultGates()
  }
}

export function saveGates(projectRoot: string, data: GatesFile): void {
  const dir = resolve(projectRoot, CONTROL_DIR)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  data.updatedAt = new Date().toISOString()
  writeFileSync(gatesPath(projectRoot), JSON.stringify(data, null, 2), 'utf-8')
}

export function getGate(projectRoot: string, phase: GatePhase): GateRecord {
  return loadGates(projectRoot).gates[phase]
}

export function isGateOpen(projectRoot: string, phase: GatePhase): boolean {
  return getGate(projectRoot, phase).status === 'open'
}

export function approveGate(projectRoot: string, phase: GatePhase, approvedBy: string, notes?: string): GatesFile {
  const data = loadGates(projectRoot)
  data.gates[phase] = { phase, status: 'open', updatedAt: new Date().toISOString(), approvedBy, notes }
  saveGates(projectRoot, data)
  return data
}

export function rejectGate(projectRoot: string, phase: GatePhase, reason: string): GatesFile {
  const data = loadGates(projectRoot)
  data.gates[phase] = { phase, status: 'blocked', updatedAt: new Date().toISOString(), reason }
  saveGates(projectRoot, data)
  return data
}

export function resetGate(projectRoot: string, phase: GatePhase): GatesFile {
  const data = loadGates(projectRoot)
  data.gates[phase] = { phase, status: 'pending', updatedAt: new Date().toISOString() }
  saveGates(projectRoot, data)
  return data
}

export function initGates(projectRoot: string, projectName: string): GatesFile {
  const path = gatesPath(projectRoot)
  if (existsSync(path)) return loadGates(projectRoot)
  const data = defaultGates(projectName)
  saveGates(projectRoot, data)
  return data
}

export function gateStatusIcon(status: GateStatus): string {
  if (status === 'open') return '✅'
  if (status === 'blocked') return '⛔'
  return '🟡'
}

export function getGateSummaryTable(data: GatesFile): string {
  const rows = PHASES.map(phase => {
    const g = data.gates[phase]
    const icon = gateStatusIcon(g.status)
    const by = g.approvedBy ?? '—'
    const notes = g.notes ?? g.reason ?? '—'
    return `| ${phase} | ${icon} ${g.status.toUpperCase()} | ${by} | ${notes} |`
  })
  return [
    '| Phase | Status | Approved By | Notes |',
    '|-------|--------|-------------|-------|',
    ...rows,
  ].join('\n')
}
