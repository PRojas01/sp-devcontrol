/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import boxen from 'boxen'
import type { DevSentinelConfig } from './types.js'
import { DEFAULT_CONFIG, saveConfig, ensureConfigDir } from './config.js'
import { CONTROLS_CATALOG } from './catalog/controls.js'
import type { ControlCategory } from './types.js'

const STACK_PRESETS: Record<string, string[]> = {
  'React + TypeScript': ['React', 'TypeScript', 'Vite'],
  'Next.js': ['Next.js', 'TypeScript', 'React'],
  'Node.js + Express': ['Node.js', 'Express', 'TypeScript'],
  'Python + FastAPI': ['Python', 'FastAPI'],
  'Electron + React': ['Electron', 'React', 'TypeScript', 'Node.js'],
  'Custom': [],
}

const CONTROL_CATEGORIES: ControlCategory[] = [
  'security', 'privacy', 'skills', 'memory', 'architecture', 'commits', 'testing', 'documentation',
]

export async function runInitWizard(projectRoot: string): Promise<DevSentinelConfig> {
  console.log(boxen(
    chalk.bold.cyan('SP-DevControl — Project Initialization\n') +
    chalk.gray('Local governance layer for AI-assisted software projects'),
    { padding: 1, borderColor: 'cyan' },
  ))
  console.log()

  const { projectName } = await inquirer.prompt<{ projectName: string }>([{
    type: 'input',
    name: 'projectName',
    message: 'Project name:',
    default: projectRoot.split('/').pop() ?? 'my-project',
    validate: (v: string) => v.trim().length > 0 || 'Required',
  }])

  const { stackPreset } = await inquirer.prompt<{ stackPreset: string }>([{
    type: 'list',
    name: 'stackPreset',
    message: 'Technology stack:',
    choices: Object.keys(STACK_PRESETS),
  }])

  let stack = STACK_PRESETS[stackPreset] ?? []
  if (stackPreset === 'Custom') {
    const { customStack } = await inquirer.prompt<{ customStack: string }>([{
      type: 'input',
      name: 'customStack',
      message: 'Stack (comma-separated):',
    }])
    stack = customStack.split(',').map(s => s.trim()).filter(Boolean)
  }

  const { agents } = await inquirer.prompt<{ agents: string[] }>([{
    type: 'checkbox',
    name: 'agents',
    message: 'Authorized agents:',
    choices: ['claude-code', 'opencode', 'codex', 'gemini', 'cursor', 'windsurf'],
    default: ['claude-code'],
  }])

  const { defaultAgent } = await inquirer.prompt<{ defaultAgent: string }>([{
    type: 'list',
    name: 'defaultAgent',
    message: 'Default agent:',
    choices: agents.length > 0 ? agents : ['claude-code'],
  }])

  const { mainBranch } = await inquirer.prompt<{ mainBranch: string }>([{
    type: 'input',
    name: 'mainBranch',
    message: 'Main git branch:',
    default: 'main',
  }])

  // Control selection by category
  const selectedControls: DevSentinelConfig['controls'] = {
    security: [], privacy: [], skills: [], memory: [],
    architecture: [], commits: [], testing: [], documentation: [],
  }

  console.log()
  console.log(chalk.bold.cyan('Control selection by category:'))
  console.log(chalk.gray('Controls define what rules the agent must follow and what violations are detected.\n'))

  for (const category of CONTROL_CATEGORIES) {
    const available = CONTROLS_CATALOG.filter(c => c.category === category)
    const defaults = available.filter(c => c.mode === 'block' || category === 'security' || category === 'privacy')

    const { selected } = await inquirer.prompt<{ selected: string[] }>([{
      type: 'checkbox',
      name: 'selected',
      message: `${chalk.bold(category.toUpperCase())} controls (${available.length} available):`,
      choices: available.map(c => ({
        name: `${c.name} ${chalk.gray(`[${c.mode}]`)}`,
        value: c.id,
        checked: defaults.some(d => d.id === c.id),
        short: c.id,
      })),
    }])

    selectedControls[category] = selected
  }

  // Skills configuration
  const { blockDestructive } = await inquirer.prompt<{ blockDestructive: boolean }>([{
    type: 'confirm',
    name: 'blockDestructive',
    message: 'Block destructive bash commands (rm -rf, DROP TABLE, etc.)?',
    default: true,
  }])

  const { scanMemory } = await inquirer.prompt<{ scanMemory: boolean }>([{
    type: 'confirm',
    name: 'scanMemory',
    message: 'Scan agent memory files for secrets/PII before each session?',
    default: true,
  }])

  const { autoCommit } = await inquirer.prompt<{ autoCommit: boolean }>([{
    type: 'confirm',
    name: 'autoCommit',
    message: 'Auto-commit approved changes with structured commit messages?',
    default: true,
  }])

  const config: DevSentinelConfig = {
    ...DEFAULT_CONFIG,
    project: projectName,
    createdAt: new Date().toISOString(),
    stack,
    agents: {
      allowed: agents.length > 0 ? agents : ['claude-code'],
      default: defaultAgent,
    },
    git: {
      ...DEFAULT_CONFIG.git,
      mainBranch,
    },
    rules: {
      ...DEFAULT_CONFIG.rules,
      autoCommit,
    },
    controls: selectedControls,
    skills: {
      ...DEFAULT_CONFIG.skills,
      blockedBashPatterns: blockDestructive ? DEFAULT_CONFIG.skills.blockedBashPatterns : [],
    },
    memory: {
      ...DEFAULT_CONFIG.memory,
      scanBeforeSession: scanMemory,
    },
  }

  ensureConfigDir(projectRoot)
  saveConfig(config, projectRoot)

  console.log()
  console.log(boxen(
    chalk.green.bold('✓ SP-DevControl initialized\n\n') +
    `  Project: ${chalk.cyan(projectName)}\n` +
    `  Stack:   ${chalk.cyan(stack.join(', ') || 'custom')}\n` +
    `  Agents:  ${chalk.cyan(agents.join(', '))}\n` +
    `  Controls: ${chalk.cyan(Object.values(selectedControls).flat().length)} active\n\n` +
    chalk.gray('  Next steps:\n') +
    chalk.gray('  sp-devcontrol init   — refresh local control artifacts\n') +
    chalk.gray('  sp-devcontrol session:start --objective "..."\n') +
    chalk.gray('  sp-devcontrol session:check --session <id>'),
    { padding: 1, borderColor: 'green' },
  ))

  return config
}
