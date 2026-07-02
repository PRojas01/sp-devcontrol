/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type ChangeStatus = 'pending' | 'approved' | 'rejected' | 'partial'
export type FileEventType = 'modified' | 'added' | 'deleted_attempt'
export type SessionMode = 'watch' | 'wrap'
export type ControlCategory = 'security' | 'architecture' | 'commits' | 'testing' | 'documentation' | 'skills' | 'memory' | 'privacy'
export type ControlMode = 'inject' | 'validate' | 'both' | 'block'
export type ViolationSeverity = 'error' | 'warning' | 'info'

export interface DevSentinelConfig {
  project: string
  version: string
  createdAt: string
  stack: string[]
  agents: {
    allowed: string[]
    default: string
  }
  scope: {
    allowed: string[]
    protected: string[]
    watchIgnore: string[]
  }
  rules: {
    blockDeletes: boolean
    requireApproval: boolean
    autoCommit: boolean
    requireMessage: boolean
    maxFilesPerChange: number
    strictCommands: boolean
    strictScope: boolean
    hardTokenCap: boolean
  }
  git: {
    mainBranch: string
    rejectedBranchPrefix: string
    commitPrefix: string
  }
  controls: {
    security: string[]
    architecture: string[]
    commits: string[]
    testing: string[]
    documentation: string[]
    skills: string[]
    memory: string[]
    privacy: string[]
  }
  skills: {
    allowedTools: string[]
    approvalRequired: string[]
    blockedTools: string[]
    blockedBashPatterns: string[]
    allowedDomains: string[]
    allowedMcpServers: string[]
  }
  memory: {
    scanBeforeSession: boolean
    redactSecretsInContext: boolean
    requireApprovalForMemoryWrites: boolean
    retentionDays: number
    sessionTokenBudget: number
    tokenAlertThreshold: number
  }
  structure: string
  storageBackend?: 'json' | 'sqlite'  // default 'json'
  inference?: {
    // Optional: configure a custom OpenAI-compatible endpoint for opencode/editors
    // If not set, inject generates a minimal opencode.json with only the MCP integration
    providerName?: string       // e.g. "my-ollama", "my-lm-studio"
    baseURL?: string            // e.g. "http://localhost:11434/v1"
    apiKey?: string             // e.g. "ollama" or an env var placeholder like "${MY_API_KEY}"
    model?: string              // e.g. "qwen2.5-coder:7b"
    npm?: string                // npm package for @ai-sdk adapter, default "@ai-sdk/openai-compatible"
  }
}

export interface FileChange {
  filepath: string
  eventType: FileEventType
  linesAdded: number
  linesRemoved: number
  outOfScope: boolean
  diffContent: string
  snapshotBefore: string
  snapshotAfter: string
}

export interface ChangeSet {
  id: string
  sessionId: string
  agent: string
  files: FileChange[]
  depsAdded: string[]
  depsInvalid: string[]
  riskLevel: RiskLevel
  status: ChangeStatus
  detectedAt: string
  decisionAt?: string
  decisionMessage?: string
  commitHash?: string
  rejectedBranch?: string
  controlViolations: ControlViolation[]
}

export interface Session {
  id: string
  project: string
  agent: string
  mode: SessionMode
  startedAt: string
  endedAt?: string
  totalChanges: number
  approved: number
  rejected: number
  objective?: string
  allowedScope?: string[]
  tokenBudget?: number
  tokenEstimate?: number
  status?: 'active' | 'completed' | 'partial' | 'blocked'
}

export interface AnalysisResult {
  riskLevel: RiskLevel
  depsAdded: string[]
  depsInvalid: string[]
  filesOutOfScope: string[]
  deleteAttempts: string[]
  warnings: string[]
}

export interface ApprovalDecision {
  action: 'approve' | 'reject' | 'approve_partial'
  approvedFiles?: string[]
  message?: string
}

export interface Control {
  id: string
  name: string
  category: ControlCategory
  description: string
  norm: string
  mode: ControlMode
  agentInstructions: string
  cursorrules?: string
  claudeMd?: string
  validator?: (files: FileChange[], config: DevSentinelConfig) => ControlViolation[]
}

export interface ControlViolation {
  controlId: string
  severity: ViolationSeverity
  message: string
  filepath?: string
  line?: number
}

export interface ValidationResult {
  passed: boolean
  violations: ControlViolation[]
  errors: ControlViolation[]
  warnings: ControlViolation[]
}

export interface InjectionResult {
  claudeMd: string
  cursorrules: string
  windsurfrules: string
  copilotInstructions: string
  agentSettings: Record<string, unknown>
  opencodeJson: string
  mcpConfig: Record<string, unknown>
}

export interface MemoryScanResult {
  hasSecrets: boolean
  hasPii: boolean
  findings: Array<{ file: string; type: 'secret' | 'pii'; match: string; line: number }>
}

export interface SessionReport {
  session: Session
  changes: ChangeSet[]
  summary: {
    proposed: number
    approved: number
    rejected: number
    partial: number
    filesModified: number
    deleteAttempts: number
    depsAdded: string[]
    controlViolations: number
  }
}

export interface StorageRow {
  [key: string]: string | number | null
}

export interface SessionRequest {
  id?: number
  sessionId: string
  requestText: string
  source: 'user' | 'system'
  createdAt?: string
}

export interface SessionChecklistItem {
  id?: number
  sessionId: string
  itemText: string
  acceptanceCriteria: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  evidence?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface MemoryEntry {
  id?: number
  key: string
  content: string
  source: string
  isObsolete?: boolean
  updatedAt?: string
}

export interface DailyLog {
  id?: number
  logDate: string
  summary: string
  completedCount: number
  pendingCount: number
  blockedCount: number
  updatedAt?: string
}

export interface TokenBudgetStatus {
  sessionId: string
  budget: number
  estimate: number
  remaining: number
  percentUsed: number
  nearLimit: boolean
}

export interface ApprovalRecord {
  id?: number
  sessionId: string
  approvalType: 'command' | 'path' | 'change'
  target: string
  scope: 'session' | 'global'
  reason: string
  createdBy: 'user' | 'system'
  createdAt?: string
  revokedAt?: string
}

export interface SnapshotRecord {
  id?: number
  sessionId: string
  label: string
  source: 'manual' | 'pre_approval' | 'rollback'
  changeId?: string
  manifestPath: string
  createdAt?: string
}
