/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, normalize } from 'path'
import { CONTROL_DIR } from './paths.js'
import type { ApprovalRecord } from './types.js'

const COMMAND_PREFIXES = ['sudo ', 'npx ', 'command ', 'time ', 'env ', 'nohup ', 'nice ', 'eval ', 'xargs ', 'timeout ', 'stdbuf ', 'bundled ']

function normalizeCommand(cmd: string): string {
  let normalized = cmd.trim().replace(/\s+/g, ' ')
  for (const prefix of COMMAND_PREFIXES) {
    while (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trimStart()
    }
  }
  return normalized
}

function commandMatches(command: string, pattern: string): boolean {
  const cmd = normalizeCommand(command)
  const pat = normalizeCommand(pattern)
  return cmd === pat || cmd.startsWith(pat + ' ') || cmd.startsWith(pat + '\t')
}

export interface PolicyPathResult {
  path: string
  protected: boolean
  approved: boolean
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  reason: string
}

export interface PolicyCommandResult {
  command: string
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK'
  approvalSource?: 'session' | 'global'
  reason: string
}

export interface PolicyFile {
  protectedPaths: string[]
  blockedCommands: string[]
  approvedCommands: string[]
  levels?: Record<string, string[]>
}

export function loadPolicy(projectRoot: string): PolicyFile {
  const path = resolve(projectRoot, CONTROL_DIR, 'policy.json')
  if (!existsSync(path)) {
    return { protectedPaths: [], blockedCommands: [], approvedCommands: [] }
  }
  const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<PolicyFile>
  return {
    protectedPaths: parsed.protectedPaths ?? [],
    blockedCommands: parsed.blockedCommands ?? [],
    approvedCommands: parsed.approvedCommands ?? [],
    levels: parsed.levels ?? {},
  }
}

export function savePolicy(projectRoot: string, policy: PolicyFile): void {
  const path = resolve(projectRoot, CONTROL_DIR, 'policy.json')
  writeFileSync(path, JSON.stringify(policy, null, 2), 'utf-8')
}

export function listProtectedPaths(projectRoot: string): string[] {
  return loadPolicy(projectRoot).protectedPaths
}

export function addProtectedPath(projectRoot: string, pattern: string): PolicyFile {
  const policy = loadPolicy(projectRoot)
  if (!policy.protectedPaths.includes(pattern)) {
    policy.protectedPaths.push(pattern)
    savePolicy(projectRoot, policy)
  }
  return policy
}

export function removeProtectedPath(projectRoot: string, pattern: string): PolicyFile {
  const policy = loadPolicy(projectRoot)
  policy.protectedPaths = policy.protectedPaths.filter(entry => entry !== pattern)
  savePolicy(projectRoot, policy)
  return policy
}

export function listApprovedCommands(projectRoot: string): string[] {
  return loadPolicy(projectRoot).approvedCommands
}

export function approveCommand(projectRoot: string, command: string): PolicyFile {
  const policy = loadPolicy(projectRoot)
  if (!policy.approvedCommands.includes(command)) {
    policy.approvedCommands.push(command)
    savePolicy(projectRoot, policy)
  }
  return policy
}

export function revokeCommand(projectRoot: string, command: string): PolicyFile {
  const policy = loadPolicy(projectRoot)
  policy.approvedCommands = policy.approvedCommands.filter(entry => entry !== command)
  savePolicy(projectRoot, policy)
  return policy
}

export function evaluatePathRisk(projectRoot: string, filepath: string, approvals: ApprovalRecord[] = []): PolicyPathResult {
  const policy = loadPolicy(projectRoot)
  const absRoot = resolve(projectRoot)
  const abs = resolve(projectRoot, filepath)
  const inProject = abs.startsWith(absRoot + '/') || abs === absRoot
  // Paths outside projectRoot cannot match relative policy patterns — prevents path traversal bypass
  const normalized = inProject ? abs.slice(absRoot.length + 1).replace(/\\/g, '/') : null
  const matched = normalized ? policy.protectedPaths.find(pattern => matchesPattern(normalized, pattern)) : undefined
  const approval = normalized ? approvals.find(entry => entry.approvalType === 'path' && matchesPattern(normalized, entry.target)) : undefined

  // Use normalized (relative) path for risk inference when in project, otherwise fall back to original
  const riskTarget = normalized ?? filepath.replace(/\\/g, '/')

  if (matched) {
    return {
      path: filepath,
      protected: true,
      approved: Boolean(approval),
      risk: inferPathRisk(riskTarget),
      reason: approval
        ? `Path matches protected pattern: ${matched}. Session approval exists: ${approval.target}`
        : `Path matches protected pattern: ${matched}`,
    }
  }

  if (!inProject) {
    return {
      path: filepath,
      protected: true,
      approved: false,
      risk: 'HIGH',
      reason: 'Path resolves outside project root — blocked: potential path traversal attack',
    }
  }
  return {
    path: filepath,
    protected: false,
    approved: Boolean(approval),
    risk: inferPathRisk(riskTarget),
    reason: approval
      ? 'Path is not protected but matches session approval: ' + approval.target
      : 'Path does not match protected patterns',
  }
}

export function evaluateCommandRisk(projectRoot: string, command: string, approvals: ApprovalRecord[] = []): PolicyCommandResult {
  const sessionApproval = approvals.find(entry => entry.approvalType === 'command' && commandMatches(command, entry.target))
  if (sessionApproval) {
    return {
      command,
      decision: 'ALLOW',
      approvalSource: 'session',
      reason: `Command matches session approval: ${sessionApproval.target}`,
    }
  }

  const policy = loadPolicy(projectRoot)
  const approved = policy.approvedCommands.find(entry => commandMatches(command, entry))
  if (approved) {
    return {
      command,
      decision: 'ALLOW',
      approvalSource: 'global',
      reason: `Command matches approved pattern: ${approved}`,
    }
  }

  const matched = policy.blockedCommands.find(entry => commandMatches(command, entry))
  if (matched) {
    return {
      command,
      decision: 'BLOCK',
      reason: `Command matches blocked pattern: ${matched}`,
    }
  }

  if (/npm install|pnpm add|yarn add|docker compose|prisma|migration/i.test(command)) {
    return {
      command,
      decision: 'REVIEW',
      reason: 'Command changes dependencies, infra or data-related behavior',
    }
  }

  return {
    command,
    decision: 'ALLOW',
    reason: 'Command does not match blocked or review patterns',
  }
}

function inferPathRisk(filepath: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (/auth|payment|database|workflow|schema|config|\.env/i.test(filepath)) return 'HIGH'
  if (/package\.json|lock|docker|docs\//i.test(filepath)) return 'MEDIUM'
  return 'LOW'
}

function matchesPattern(filepath: string, pattern: string): boolean {
  if (pattern.endsWith('/**')) {
    return filepath.startsWith(pattern.slice(0, -3))
  }
  return filepath === pattern || filepath.startsWith(pattern.replace(/\*\*/g, ''))
}
