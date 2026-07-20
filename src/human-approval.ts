/**
 * SP-DevControl v2.0.0
 * Human approval token verification for non-interactive approval paths
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { timingSafeEqual } from 'node:crypto'

export const HUMAN_APPROVAL_TOKEN_ENV = 'DEVCONTROL_HUMAN_APPROVAL_TOKEN'

export interface HumanApprovalVerification {
  ok: boolean
  reason?: string
}

export function verifyHumanApprovalToken(
  providedToken: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): HumanApprovalVerification {
  const expectedToken = env[HUMAN_APPROVAL_TOKEN_ENV]

  if (!expectedToken || expectedToken.trim().length === 0) {
    return {
      ok: false,
      reason: `${HUMAN_APPROVAL_TOKEN_ENV} is not configured; non-interactive approval is disabled.`,
    }
  }

  if (!providedToken || providedToken.length === 0) {
    return {
      ok: false,
      reason: 'Human approval token is required for non-interactive approval.',
    }
  }

  const provided = Buffer.from(providedToken)
  const expected = Buffer.from(expectedToken)

  if (provided.length !== expected.length) {
    return {
      ok: false,
      reason: 'Human approval token is invalid.',
    }
  }

  if (!timingSafeEqual(provided, expected)) {
    return {
      ok: false,
      reason: 'Human approval token is invalid.',
    }
  }

  return { ok: true }
}
