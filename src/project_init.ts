/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import type { DevSentinelConfig } from './types.js'
import { ensureConfigDir, hasConfig, saveConfig, loadConfig, DEFAULT_CONFIG } from './config.js'
import { CONTROL_DIR, MEMORY_DIR } from './paths.js'
import { initGates } from './gates.js'
import { generateProjectDocs, getDocsCatalog } from './docs-generator.js'

export const DEFAULT_PROTECTED_PATHS = [
  '.env',
  '.env.local',
  '.env.*',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Dockerfile',
  'docker-compose.yml',
  '.github/workflows/**',
  '.devcontrol/**',
  '.devcontrol/',
  'CLAUDE.md',
  '.cursorrules',
  '.windsurfrules',
  'opencode.json',
  'src/auth/**',
  'src/payments/**',
  'src/database/**',
  'src/config/**',
  'prisma/schema.prisma',
  'docs/',
  'CHANGELOG.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'tsconfig.json',
]

export const DEFAULT_BLOCKED_COMMANDS = [
  'rm -rf',
  'git reset --hard',
  'git clean -fd',
  'git push --force',
  'docker compose down -v',
  'npm uninstall',
  'pnpm remove',
  'yarn remove',
]

export interface InitSummary {
  createdDocs: string[]
  gitPresent: boolean
  configCreated: boolean
  baselinePath: string
  policyPath: string
}

export function initializeControlledProject(projectRoot: string, partial?: Partial<DevSentinelConfig>): InitSummary {
  ensureConfigDir(projectRoot)
  const docsDir = resolve(projectRoot, 'docs')
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })
  const controlDir = resolve(projectRoot, CONTROL_DIR)
  if (!existsSync(controlDir)) mkdirSync(controlDir, { recursive: true })
  const memoryDir = resolve(projectRoot, MEMORY_DIR)
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true })

  let configCreated = false
  const projectName = partial?.project ?? projectRoot.split('/').pop() ?? 'project'
  if (!hasConfig(projectRoot)) {
    const config: DevSentinelConfig = {
      ...DEFAULT_CONFIG,
      ...partial,
      project: projectName,
      createdAt: new Date().toISOString(),
    }
    saveConfig(config, projectRoot)
    configCreated = true
  }

  initGates(projectRoot, projectName)

  // Generate full document set (17 docs) from the docs-generator catalog
  const createdDocs = generateProjectDocs(
    hasConfig(projectRoot) ? loadConfig(projectRoot) : { ...DEFAULT_CONFIG, project: projectName },
    projectRoot,
    getDocsCatalog().map(d => d.id),
  )

  const baselinePath = resolve(projectRoot, join(CONTROL_DIR, 'baseline.json'))
  if (!existsSync(baselinePath)) {
    writeFileSync(baselinePath, JSON.stringify({
      createdAt: new Date().toISOString(),
      projectRoot,
      gitPresent: existsSync(resolve(projectRoot, '.git')),
    }, null, 2), 'utf-8')
  }

  const policyPath = resolve(projectRoot, join(CONTROL_DIR, 'policy.json'))
  if (!existsSync(policyPath)) {
    writeFileSync(policyPath, JSON.stringify({
      protectedPaths: DEFAULT_PROTECTED_PATHS,
      blockedCommands: DEFAULT_BLOCKED_COMMANDS,
      approvedCommands: [],
      levels: {
        low: ['docs', 'textos', 'estilos menores'],
        medium: ['componentes nuevos', 'refactor local'],
        high: ['dependencias', 'configuracion', 'database', 'auth', 'payments'],
      },
    }, null, 2), 'utf-8')
  }

  const protectedPathsFile = resolve(projectRoot, join(CONTROL_DIR, 'protected-paths.json'))
  if (!existsSync(protectedPathsFile)) {
    writeFileSync(protectedPathsFile, JSON.stringify(DEFAULT_PROTECTED_PATHS, null, 2), 'utf-8')
  }

  return {
    createdDocs,
    gitPresent: existsSync(resolve(projectRoot, '.git')),
    configCreated,
    baselinePath,
    policyPath,
  }
}
