/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import type { Session, SessionMode } from './types.js'

const sessionCounters = new Map<string, number>()

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

export function generateSessionId(date: Date = new Date(), counter?: number): string {
  const key = dateKey(date)
  if (counter !== undefined) {
    return `ds-${key}-${String(counter).padStart(3, '0')}`
  }
  const current = (sessionCounters.get(key) ?? 0) + 1
  sessionCounters.set(key, current)
  return `ds-${key}-${String(current).padStart(3, '0')}`
}

export function generateChangeId(sessionId: string, changeNumber: number): string {
  return `${sessionId}.${String(changeNumber).padStart(3, '0')}`
}

export function parseSessionDate(sessionId: string): Date {
  const match = sessionId.match(/^ds-(\d{4})(\d{2})(\d{2})-(\d{3})$/)
  if (!match) throw new Error(`Invalid session ID format: ${sessionId}`)
  return new Date(`${match[1]}-${match[2]}-${match[3]}`)
}

export function parseSessionNumber(sessionId: string): number {
  const match = sessionId.match(/^ds-\d{8}-(\d{3})$/)
  if (!match) throw new Error(`Invalid session ID format: ${sessionId}`)
  return parseInt(match[1], 10)
}

export function createSession(
  id: string,
  project: string,
  agent: string,
  mode: SessionMode,
): Session {
  return {
    id,
    project,
    agent,
    mode,
    startedAt: new Date().toISOString(),
    totalChanges: 0,
    approved: 0,
    rejected: 0,
  }
}

export function formatSessionId(sessionId: string): string {
  const match = sessionId.match(/^ds-(\d{4})(\d{2})(\d{2})-(\d{3})$/)
  if (!match) return sessionId
  return `ds-${match[1]}/${match[2]}/${match[3]}-#${match[4]}`
}

export function isValidSessionId(id: string): boolean {
  return /^ds-\d{8}-\d{3}$/.test(id)
}

export function isValidChangeId(id: string): boolean {
  return /^ds-\d{8}-\d{3}\.\d{3}$/.test(id)
}
