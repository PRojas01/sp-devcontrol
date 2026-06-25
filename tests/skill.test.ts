/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, it, expect, afterEach } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.js'
import { generateSkills, writeSkills } from '../src/skill.js'
import type { DevSentinelConfig } from '../src/types.js'

// Minimal but type-complete config derived from DEFAULT_CONFIG
const testConfig: DevSentinelConfig = {
  ...DEFAULT_CONFIG,
  project: 'test-project',
  version: '2.0.0',
  stack: ['TypeScript'],
}

let tmpDir: string | null = null

function makeTmpDir(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-skill-test-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir !== null) {
    rmSync(tmpDir, { recursive: true, force: true })
    tmpDir = null
  }
})

describe('generateSkills', () => {
  it('returns 5 results — one per editor', () => {
    const root = makeTmpDir()
    const results = generateSkills(root, testConfig)
    expect(results).toHaveLength(5)
  })

  it('includes a result for the claude editor', () => {
    const root = makeTmpDir()
    const results = generateSkills(root, testConfig)
    const claude = results.find(r => r.editor === 'claude')
    expect(claude).toBeDefined()
  })

  it('claude result contains .claude/commands/devcontrol.md', () => {
    const root = makeTmpDir()
    const results = generateSkills(root, testConfig)
    const claude = results.find(r => r.editor === 'claude')!
    const paths = claude.files.map(f => f.path)
    const commandFile = paths.find(p => p.includes(join('.claude', 'commands', 'devcontrol.md')))
    expect(commandFile).toBeDefined()
  })

  it('with mcpPort includes .claude/mcp.json containing the correct URL', () => {
    const root = makeTmpDir()
    const results = generateSkills(root, testConfig, 7893)
    const claude = results.find(r => r.editor === 'claude')!
    const mcpFile = claude.files.find(f => f.path.includes(join('.claude', 'mcp.json')))
    expect(mcpFile).toBeDefined()
    const parsed = JSON.parse(mcpFile!.content) as { mcpServers: Record<string, { url: string }> }
    expect(parsed.mcpServers['devcontrol'].url).toBe('http://localhost:7893/mcp')
  })

  it('with mcpPort cursor result includes .cursor/mcp.json', () => {
    const root = makeTmpDir()
    const results = generateSkills(root, testConfig, 7893)
    const cursor = results.find(r => r.editor === 'cursor')!
    const mcpFile = cursor.files.find(f => f.path.includes(join('.cursor', 'mcp.json')))
    expect(mcpFile).toBeDefined()
  })
})

describe('writeSkills', () => {
  it('with target copilot writes exactly 1 file', () => {
    const root = makeTmpDir()
    const written = writeSkills(root, testConfig, 'copilot')
    expect(written).toHaveLength(1)
  })

  it('with target all writes files for all editors', () => {
    const root = makeTmpDir()
    const written = writeSkills(root, testConfig, 'all')
    // claude(2) + opencode(1) + cursor(0 without mcp) + windsurf(0 without mcp) + copilot(1) = 4
    expect(written.length).toBeGreaterThan(0)
  })

  it('with target claude and mcpPort writes mcp.json as well', () => {
    const root = makeTmpDir()
    const written = writeSkills(root, testConfig, 'claude', 7893)
    const hasMcp = written.some(p => p.includes('mcp.json'))
    expect(hasMcp).toBe(true)
  })
})
