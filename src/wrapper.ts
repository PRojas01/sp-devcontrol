import { mkdirSync, cpSync, existsSync, rmSync, readdirSync, readFileSync, writeFileSync as fsWriteFileSync } from 'fs'
import { join, relative, resolve } from 'path'
import { tmpdir } from 'os'
import { execa } from 'execa'
import chalk from 'chalk'
import type { DevSentinelConfig, FileChange } from './types.js'
import { generateDiff, countDiffLines } from './diff.js'
import { checkScope } from './analyzer.js'
import { redactSecretsFromContent } from './validator.js'

const AGENT_COMMANDS: Record<string, (prompt: string, cwd: string) => [string, string[]]> = {
  'claude-code': (prompt, cwd) => ['claude', ['--print', prompt, '--cwd', cwd]],
  'claude': (prompt, cwd) => ['claude', ['--print', prompt, '--cwd', cwd]],
  'opencode': (prompt, cwd) => ['opencode', ['run', prompt]],
  'codex': (prompt, cwd) => ['codex', ['exec', prompt]],
  'gemini': (prompt, cwd) => ['gemini', [prompt]],
}

export interface WrapResult {
  sandboxPath: string
  fileChanges: FileChange[]
  agentOutput: string
  exitCode: number
}

export async function runInSandbox(
  agent: string,
  prompt: string,
  projectRoot: string,
  config: DevSentinelConfig,
): Promise<WrapResult> {
  const sandboxPath = join(tmpdir(), `sp-devcontrol-${Date.now()}`)
  mkdirSync(sandboxPath, { recursive: true })

  console.log(chalk.gray(`  Creating sandbox at ${sandboxPath}...`))
  copyProjectToSandbox(projectRoot, sandboxPath, config)

  if (config.memory.redactSecretsInContext) {
    redactProtectedFilesInSandbox(sandboxPath, config)
  }

  const getCmd = AGENT_COMMANDS[agent]
  if (!getCmd) {
    throw new Error(`Unknown agent: ${agent}. Supported: ${Object.keys(AGENT_COMMANDS).join(', ')}`)
  }

  const [cmd, args] = getCmd(prompt, sandboxPath)
  let agentOutput = ''
  let exitCode = 0

  console.log(chalk.cyan(`  Running: ${agent} ...`))

  try {
    const result = await execa(cmd, args, {
      cwd: sandboxPath,
      timeout: 300_000,
      reject: false,
    })
    agentOutput = (result.stdout ?? '') + (result.stderr ?? '')
    exitCode = result.exitCode ?? 0
  } catch (err) {
    agentOutput = String(err)
    exitCode = 1
  }

  const fileChanges = collectDiffs(projectRoot, sandboxPath, config)

  return { sandboxPath, fileChanges, agentOutput, exitCode }
}

export function applyApprovedChanges(
  sandboxPath: string,
  projectRoot: string,
  approvedFiles: string[],
  config: DevSentinelConfig,
): void {
  const approvedSet = new Set(approvedFiles)

  for (const filepath of approvedFiles) {
    const srcPath = join(sandboxPath, filepath)
    const destPath = join(projectRoot, filepath)

    if (!existsSync(srcPath)) continue

    const destDir = destPath.substring(0, destPath.lastIndexOf('/') + 1)
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })

    cpSync(srcPath, destPath, { recursive: false })
  }
}

export function cleanupSandbox(sandboxPath: string): void {
  if (existsSync(sandboxPath)) {
    rmSync(sandboxPath, { recursive: true, force: true })
  }
}

function copyProjectToSandbox(projectRoot: string, sandboxPath: string, config: DevSentinelConfig): void {
  const protectedPatterns = config.scope.protected.map(p => p.replace('*', ''))

  const ignore = (src: string): boolean => {
    const rel = relative(projectRoot, src).replace(/\\/g, '/')
    if (rel.startsWith('node_modules')) return true
    if (rel.startsWith('dist/')) return true
    if (rel.startsWith('.git/')) return true
    if (rel.startsWith('.devcontrol/')) return true
    for (const p of protectedPatterns) {
      if (rel.startsWith(p) || rel === p.replace(/\/$/, '')) return true
    }
    return false
  }

  cpSync(projectRoot, sandboxPath, {
    recursive: true,
    filter: (src) => !ignore(src),
  })
}

function redactProtectedFilesInSandbox(sandboxPath: string, _config: DevSentinelConfig): void {
  const sensitiveFiles = ['.env', '.env.local', '.env.production']
  for (const file of sensitiveFiles) {
    const filepath = join(sandboxPath, file)
    if (!existsSync(filepath)) continue
    const content = readFileSync(filepath, 'utf-8')
    const redacted = redactSecretsFromContent(content)
    fsWriteFileSync(filepath, redacted, 'utf-8')
  }
}

function collectDiffs(projectRoot: string, sandboxPath: string, config: DevSentinelConfig): FileChange[] {
  const changes: FileChange[] = []
  const allFiles = new Set<string>()

  collectFilePaths(sandboxPath, sandboxPath, allFiles)
  collectFilePaths(projectRoot, projectRoot, allFiles, ['node_modules', 'dist', '.git', '.devcontrol'])

  for (const relPath of allFiles) {
    const realPath = join(projectRoot, relPath)
    const sandboxFilePath = join(sandboxPath, relPath)

    const realExists = existsSync(realPath)
    const sandboxExists = existsSync(sandboxFilePath)

    if (!sandboxExists && realExists) {
      // Agent tried to delete
      const before = readFileSafe(realPath)
      changes.push(buildFileChange(relPath, before, '', 'deleted_attempt', config))
      continue
    }

    if (!sandboxExists) continue

    const before = realExists ? readFileSafe(realPath) : ''
    const after = readFileSafe(sandboxFilePath)

    if (before === after) continue

    const eventType = realExists ? 'modified' : 'added'
    changes.push(buildFileChange(relPath, before, after, eventType, config))
  }

  return changes
}

function buildFileChange(
  filepath: string,
  before: string,
  after: string,
  eventType: 'modified' | 'added' | 'deleted_attempt',
  config: DevSentinelConfig,
): FileChange {
  const diff = generateDiff(before, after, filepath)
  const stats = countDiffLines(before, after)
  return {
    filepath,
    eventType,
    linesAdded: stats.linesAdded,
    linesRemoved: stats.linesRemoved,
    outOfScope: checkScope(filepath, config),
    diffContent: diff,
    snapshotBefore: before,
    snapshotAfter: after,
  }
}

function collectFilePaths(
  baseDir: string,
  currentDir: string,
  result: Set<string>,
  skipDirs: string[] = [],
): void {
  if (!existsSync(currentDir)) return
  const entries = readdirSync(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue
    const abs = join(currentDir, entry.name)
    const rel = relative(baseDir, abs).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      collectFilePaths(baseDir, abs, result, skipDirs)
    } else {
      result.add(rel)
    }
  }
}

function readFileSafe(filePath: string): string {
  if (!existsSync(filePath)) return ''
  try {
    return readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}
