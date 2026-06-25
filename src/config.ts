import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import type { DevSentinelConfig } from './types.js'

export const CONFIG_DIR = '.devcontrol'
export const CONFIG_FILE = '.devcontrol/config.json'

export const DEFAULT_CONFIG: DevSentinelConfig = {
  project: '',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  stack: [],
  agents: {
    allowed: ['claude-code', 'opencode', 'codex'],
    default: 'claude-code',
  },
  scope: {
    allowed: ['src/', 'scripts/', 'tests/', 'lib/', 'docs/'],
    protected: ['dist/', '.env', '.devcontrol/', '*.lock', 'node_modules/'],
    watchIgnore: ['node_modules/', 'dist/', '.git/', '.devcontrol/'],
  },
  rules: {
    blockDeletes: true,
    requireApproval: true,
    autoCommit: true,
    requireMessage: false,
    maxFilesPerChange: 20,
  },
  git: {
    mainBranch: 'main',
    rejectedBranchPrefix: 'sp-devcontrol/rejected',
    commitPrefix: 'sp-devcontrol',
  },
  controls: {
    security: ['sec-secrets', 'sec-sqli', 'sec-cmd', 'sec-xss', 'sec-deps', 'sec-prompt-inj'],
    architecture: [],
    commits: ['vcs-conv-commits'],
    testing: ['test-no-console'],
    documentation: [],
    skills: ['skill-bash', 'skill-scope'],
    memory: ['mem-scan', 'mem-context'],
    privacy: ['priv-pii', 'priv-logging'],
  },
  skills: {
    allowedTools: ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'],
    approvalRequired: ['WebSearch', 'WebFetch', 'Agent'],
    blockedTools: ['computer-use'],
    blockedBashPatterns: ['rm -rf', 'del /f /s', 'DROP TABLE', 'TRUNCATE', 'git reset --hard', 'git push --force', 'format '],
    allowedDomains: ['docs.npmjs.com', 'developer.mozilla.org', 'github.com', 'stackoverflow.com', 'nodejs.org'],
    allowedMcpServers: ['filesystem', 'git', 'sqlite'],
  },
  memory: {
    scanBeforeSession: true,
    redactSecretsInContext: true,
    requireApprovalForMemoryWrites: true,
    retentionDays: 30,
    sessionTokenBudget: 12000,
    tokenAlertThreshold: 0.85,
  },
  structure: 'default',
}

export function loadConfig(projectRoot: string = process.cwd()): DevSentinelConfig {
  const configPath = resolve(projectRoot, CONFIG_FILE)
  if (!existsSync(configPath)) {
    throw new Error(`No config found at ${configPath}. Run "sp-devcontrol init" first.`)
  }
  const raw = readFileSync(configPath, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<DevSentinelConfig>
  return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, parsed as Record<string, unknown>) as unknown as DevSentinelConfig
}

export function saveConfig(config: DevSentinelConfig, projectRoot: string = process.cwd()): void {
  const dirPath = resolve(projectRoot, CONFIG_DIR)
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
  const configPath = resolve(projectRoot, CONFIG_FILE)
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export function hasConfig(projectRoot: string = process.cwd()): boolean {
  return existsSync(resolve(projectRoot, CONFIG_FILE))
}

export function ensureConfigDir(projectRoot: string = process.cwd()): void {
  const dirs = [
    join(projectRoot, CONFIG_DIR),
    join(projectRoot, CONFIG_DIR, 'reports'),
    join(projectRoot, CONFIG_DIR, 'deleted-attempts'),
    join(projectRoot, CONFIG_DIR, 'injected'),
    join(projectRoot, CONFIG_DIR, 'memory'),
    join(projectRoot, CONFIG_DIR, 'memory', 'checkpoints'),
    join(projectRoot, CONFIG_DIR, 'sessions'),
    join(projectRoot, CONFIG_DIR, 'storage'),
  ]
  for (const dir of dirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    const baseVal = base[key]
    const overVal = override[key]
    if (isPlainObject(baseVal) && isPlainObject(overVal)) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, overVal as Record<string, unknown>)
    } else if (overVal !== undefined) {
      result[key] = overVal
    }
  }
  return result
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}
