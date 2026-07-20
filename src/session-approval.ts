/**
 * SP-DevControl v2.0.0
 * Session approval grants guarded by human approval tokens
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { getSession, insertApproval, type JsonDb } from './storage.js'
import { verifyHumanApprovalToken } from './human-approval.js'
import type { ApprovalRecord } from './types.js'

const APPROVAL_TYPES: ApprovalRecord['approvalType'][] = ['command', 'path', 'change']

export interface GrantSessionApprovalOptions {
  sessionId: string
  approvalType: string
  target: string
  reason: string
  humanApprovalToken?: string
}

function isApprovalType(value: string): value is ApprovalRecord['approvalType'] {
  return APPROVAL_TYPES.includes(value as ApprovalRecord['approvalType'])
}

export function grantSessionApproval(
  db: JsonDb,
  options: GrantSessionApprovalOptions,
): ApprovalRecord {
  const verification = verifyHumanApprovalToken(options.humanApprovalToken)
  if (!verification.ok) {
    throw new Error(verification.reason)
  }

  if (!isApprovalType(options.approvalType)) {
    throw new Error(`Invalid approval type: ${options.approvalType}. Expected command, path or change.`)
  }

  const session = getSession(db, options.sessionId)
  if (!session) throw new Error(`Session not found: ${options.sessionId}`)

  return insertApproval(db, {
    sessionId: options.sessionId,
    approvalType: options.approvalType,
    target: options.target,
    scope: 'session',
    reason: options.reason,
    createdBy: 'user',
  })
}
