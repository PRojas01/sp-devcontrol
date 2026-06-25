/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, mkdirSync, writeFileSync, appendFileSync } from 'fs'
import { join, resolve } from 'path'
import type { Session, SessionChecklistItem, SessionRequest } from './types.js'
import { SESSIONS_DIR, dateFolder } from './paths.js'

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function sessionBaseDir(projectRoot: string, date: Date = new Date()): string {
  const dir = resolve(projectRoot, join(SESSIONS_DIR, dateFolder(date)))
  ensureDir(dir)
  return dir
}

export function writeSessionArtifacts(
  projectRoot: string,
  session: Session,
  requests: SessionRequest[],
  checklist: SessionChecklistItem[],
): void {
  const baseDir = sessionBaseDir(projectRoot, new Date(session.startedAt))
  const prefix = session.id

  const sessionMd = [
    `# ${prefix}`,
    '',
    '## Metadatos',
    `- Fecha: ${new Date(session.startedAt).toISOString()}`,
    `- Estado: ${session.status ?? 'active'}`,
    `- Objetivo: ${session.objective ?? 'sin objetivo definido'}`,
    `- Agente: ${session.agent}`,
    `- Modo: ${session.mode}`,
    '',
    '## Solicitudes',
    ...requests.map(req => `- ${req.requestText}`),
    '',
    '## Alcance permitido',
    ...(session.allowedScope ?? []).map(scope => `- ${scope}`),
  ].join('\n')

  const checklistMd = [
    `# Checklist ${prefix}`,
    '',
    '| Item | Criterio de aceptacion | Estado | Evidencia | Observacion |',
    '|---|---|---|---|---|',
    ...checklist.map(item => `| ${item.itemText} | ${item.acceptanceCriteria} | ${item.status} | ${item.evidence ?? ''} | ${item.notes ?? ''} |`),
  ].join('\n')

  const contextJson = JSON.stringify({
    sessionId: session.id,
    objective: session.objective ?? '',
    allowedScope: session.allowedScope ?? [],
    tokenBudget: session.tokenBudget ?? 0,
    tokenEstimate: session.tokenEstimate ?? 0,
    status: session.status ?? 'active',
  }, null, 2)

  writeFileSync(join(baseDir, `${prefix}.md`), sessionMd, 'utf-8')
  writeFileSync(join(baseDir, `${prefix}-checklist.md`), checklistMd, 'utf-8')
  writeFileSync(join(baseDir, `${prefix}-context.json`), contextJson, 'utf-8')
  writeFileSync(join(baseDir, `${prefix}-diff-summary.md`), '# Diff Summary\n\n- pendiente\n', 'utf-8')
  appendFileSync(join(baseDir, `${prefix}-audit.jsonl`), `${JSON.stringify({
    time: new Date().toISOString(),
    session: session.id,
    action: 'session_artifacts_updated',
    status: session.status ?? 'active',
  })}\n`, 'utf-8')
}
