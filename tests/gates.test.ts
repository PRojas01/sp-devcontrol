/**
 * SP-DevControl v2.0.0 — Human Authorization Gates tests
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro
 * MIT License
 */

import { mkdtempSync, rmSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  approveGate, getGate, getGateSummaryTable, initGates,
  isGateOpen, loadGates, rejectGate, resetGate,
} from '../src/gates.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-gates-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

describe('human authorization gates', () => {
  it('all gates start as pending after initGates', () => {
    const dir = tempProject()
    const data = initGates(dir, 'test-project')
    expect(data.gates.design.status).toBe('pending')
    expect(data.gates.development.status).toBe('pending')
    expect(data.gates.review.status).toBe('pending')
    expect(data.gates.publish.status).toBe('pending')
    rmSync(dir, { recursive: true, force: true })
  })

  it('approveGate sets status open with approvedBy and notes', () => {
    const dir = tempProject()
    initGates(dir, 'test-project')
    approveGate(dir, 'design', 'Pedro', 'architecture reviewed')
    const gate = getGate(dir, 'design')
    expect(gate.status).toBe('open')
    expect(gate.approvedBy).toBe('Pedro')
    expect(gate.notes).toBe('architecture reviewed')
    expect(gate.updatedAt).toBeTruthy()
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejectGate sets status blocked with reason', () => {
    const dir = tempProject()
    initGates(dir, 'test-project')
    rejectGate(dir, 'design', 'missing architecture doc')
    const gate = getGate(dir, 'design')
    expect(gate.status).toBe('blocked')
    expect(gate.reason).toBe('missing architecture doc')
    rmSync(dir, { recursive: true, force: true })
  })

  it('resetGate returns gate to pending', () => {
    const dir = tempProject()
    initGates(dir, 'test-project')
    approveGate(dir, 'review', 'Pedro')
    resetGate(dir, 'review')
    expect(getGate(dir, 'review').status).toBe('pending')
    rmSync(dir, { recursive: true, force: true })
  })

  it('isGateOpen returns false for pending and blocked, true only for open', () => {
    const dir = tempProject()
    initGates(dir, 'test-project')
    expect(isGateOpen(dir, 'design')).toBe(false)
    rejectGate(dir, 'development', 'not ready')
    expect(isGateOpen(dir, 'development')).toBe(false)
    approveGate(dir, 'publish', 'Pedro')
    expect(isGateOpen(dir, 'publish')).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('loadGates creates defaults when gates.json is missing', () => {
    const dir = tempProject()
    // Do NOT call initGates — just load cold
    const data = loadGates(dir)
    expect(data.gates.design.status).toBe('pending')
    expect(data.gates.publish.status).toBe('pending')
    rmSync(dir, { recursive: true, force: true })
  })

  it('getGateSummaryTable includes all 4 phases', () => {
    const dir = tempProject()
    initGates(dir, 'test-project')
    approveGate(dir, 'design', 'Pedro', 'approved')
    const data = loadGates(dir)
    const table = getGateSummaryTable(data)
    expect(table).toContain('design')
    expect(table).toContain('development')
    expect(table).toContain('review')
    expect(table).toContain('publish')
    expect(table).toContain('✅')
    expect(table).toContain('Pedro')
    rmSync(dir, { recursive: true, force: true })
  })

  it('gates persist across loadGates calls', () => {
    const dir = tempProject()
    initGates(dir, 'test-project')
    approveGate(dir, 'design', 'Alice', 'spec done')
    rejectGate(dir, 'publish', 'not ready for prod')
    const reloaded = loadGates(dir)
    expect(reloaded.gates.design.status).toBe('open')
    expect(reloaded.gates.design.approvedBy).toBe('Alice')
    expect(reloaded.gates.publish.status).toBe('blocked')
    expect(reloaded.gates.publish.reason).toBe('not ready for prod')
    rmSync(dir, { recursive: true, force: true })
  })
})
