import { execa } from 'execa'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

export interface TestResult {
  passed: boolean
  total: number
  passedTests: number
  failedTests: number
  coverage?: {
    lines: number
    statements: number
    branches: number
    functions: number
  }
  failures: Array<{ file: string; name: string; message: string }>
  raw: string
}

export interface TestRunnerConfig {
  command: string
  args: string[]
  coverageCommand?: string
  coverageArgs?: string[]
  coverageFile?: string
  timeout?: number
}

const DEFAULT_CONFIG: TestRunnerConfig = {
  command: 'npm',
  args: ['test'],
  timeout: 120_000,
}

export function getTestRunnerConfig(projectRoot: string, overrides?: Partial<TestRunnerConfig>): TestRunnerConfig {
  const pkgPath = resolve(projectRoot, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (pkg.scripts?.test) {
        return { ...DEFAULT_CONFIG, ...overrides }
      }
    } catch { }
  }
  return { ...DEFAULT_CONFIG, ...overrides }
}

export async function runTests(projectRoot: string, config?: Partial<TestRunnerConfig>): Promise<TestResult> {
  const cfg = getTestRunnerConfig(projectRoot, config)
  const start = Date.now()

  try {
    const { stdout, stderr, exitCode } = await execa(cfg.command, cfg.args, {
      cwd: projectRoot,
      reject: false,
      timeout: cfg.timeout,
      all: true,
    })

    const allOutput = (stdout + '\n' + stderr).trim()
    const result = parseTestOutput(allOutput, exitCode ?? 0)

    result.raw = allOutput

    if (result.passed && cfg.coverageFile) {
      result.coverage = parseCoverage(resolve(projectRoot, cfg.coverageFile))
    }

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      passed: false,
      total: 0,
      passedTests: 0,
      failedTests: 0,
      failures: [{ file: 'runner', name: 'ExecutionError', message: msg }],
      raw: msg,
    }
  }
}

function parseTestOutput(output: string, exitCode: number): TestResult {
  const result: TestResult = {
    passed: exitCode === 0,
    total: 0,
    passedTests: 0,
    failedTests: 0,
    failures: [],
    raw: output,
  }

  const lines = output.split('\n')

  for (const line of lines) {
    const testMatch = line.match(/^(✓|✖|×|✗|✔|PASS|FAIL|ok|not ok|\d+\.\.\d+)/)
    if (testMatch) result.total++

    const failMatch = line.match(/^\s*(?:✖|×|✗|FAIL)\s+(.+?)(?:\s+\(|:|\s*$)/)
    if (failMatch) {
      result.failedTests++
      result.failures.push({
        file: failMatch[1] || 'unknown',
        name: failMatch[1]?.trim() || 'unknown',
        message: line,
      })
    }

    const passMatch = line.match(/^\s*(?:✓|✔|PASS|ok)\s+\d+\s+(.+)/)
    if (passMatch) result.passedTests++

    const summaryMatch = line.match(/Tests\s+(\d+)\s+passed(?:.*?(\d+)\s+failed)?/)
    if (summaryMatch) {
      result.passedTests = parseInt(summaryMatch[1], 10)
      result.failedTests = summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0
      result.total = result.passedTests + result.failedTests
    }

    const vitestSummary = line.match(/^(\d+)\s+passed(?:.*?(\d+)\s+failed)?/)
    if (vitestSummary && result.total === 0) {
      result.passedTests = parseInt(vitestSummary[1], 10)
      result.failedTests = vitestSummary[2] ? parseInt(vitestSummary[2], 10) : 0
      result.total = result.passedTests + result.failedTests
    }
  }

  result.passed = result.failedTests === 0 && exitCode === 0
  return result
}

function parseCoverage(coverageFile: string): TestResult['coverage'] {
  try {
    const content = readFileSync(coverageFile, 'utf-8')

    const jsonMatch = content.match(/\{[\s\S]*"total"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const total = parsed.total
      if (total) {
        return {
          lines: total.lines?.pct ?? 0,
          statements: total.statements?.pct ?? 0,
          branches: total.branches?.pct ?? 0,
          functions: total.functions?.pct ?? 0,
        }
      }
    }

    const lcovLines = content.match(/^LF:(\d+)\nLH:(\d+)/m)
    if (lcovLines) {
      const found = parseInt(lcovLines[1], 10)
      const hit = parseInt(lcovLines[2], 10)
      const lines = found > 0 ? Math.round((hit / found) * 100) : 0
      return { lines, statements: lines, branches: 0, functions: 0 }
    }
  } catch { }

  return undefined
}
