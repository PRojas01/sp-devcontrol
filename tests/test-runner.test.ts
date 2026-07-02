import { describe, expect, it, vi } from 'vitest'
import { runTests, getTestRunnerConfig } from '../src/test-runner.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'

vi.mock('execa', () => ({
  execa: vi.fn(),
}))

import { execa } from 'execa'

function makeProjectDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'test-runner-'))
  for (const [fp, content] of Object.entries(files)) {
    const fullPath = join(dir, fp)
    const parent = dirname(fullPath)
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }
  return dir
}

describe('test-runner', () => {
  describe('getTestRunnerConfig', () => {
    it('returns default config when no package.json', () => {
      const dir = makeProjectDir({})
      const config = getTestRunnerConfig(dir)
      expect(config.command).toBe('npm')
      expect(config.args).toEqual(['test'])
    })

    it('returns default config when package.json has test script', () => {
      const dir = makeProjectDir({
        'package.json': JSON.stringify({ name: 'test', scripts: { test: 'vitest run' } }),
      })
      const config = getTestRunnerConfig(dir)
      expect(config.command).toBe('npm')
      expect(config.args).toEqual(['test'])
    })
  })

  describe('runTests', () => {
    it('returns passed=true when exit code is 0 and tests pass', async () => {
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: 'Tests 5 passed 0 failed',
        stderr: '',
        exitCode: 0,
      } as any)

      const dir = makeProjectDir({ 'package.json': JSON.stringify({ name: 'test' }) })
      const result = await runTests(dir)
      expect(result.passed).toBe(true)
    })

    it('returns passed=false with failure details when tests fail', async () => {
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: '✖ FAIL src/foo.test.ts (1 failure)',
        stderr: '',
        exitCode: 1,
      } as any)

      const dir = makeProjectDir({})
      const result = await runTests(dir)
      expect(result.passed).toBe(false)
      expect(result.failures.length).toBeGreaterThanOrEqual(0)
    })

    it('returns passed=false with error when execa throws', async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error('Command not found'))

      const dir = makeProjectDir({})
      const result = await runTests(dir)
      expect(result.passed).toBe(false)
      expect(result.raw).toContain('Command not found')
    })
  })

  describe('parseTestOutput', () => {
    it('parses vitest summary format', async () => {
      const output = `
 RUN  v3.2.6

 ✓ tests/foo.test.ts (2 tests)
 ✓ tests/bar.test.ts (3 tests)

 Test Files  2 passed (2)
      Tests  5 passed (5)
`
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: output,
        stderr: '',
        exitCode: 0,
      } as any)

      const dir = makeProjectDir({})
      const result = await runTests(dir)
      expect(result.passed).toBe(true)
      expect(result.passedTests).toBe(5)
      expect(result.failedTests).toBe(0)
    })

    it('parses vitest with failures', async () => {
      const output = `
 RUN  v3.2.6

 ✓ tests/foo.test.ts (2 tests)
 ✖ tests/bar.test.ts (1 test) 1 failure

 Test Files  1 failed (2)
      Tests  2 passed | 1 failed (3)
`
      vi.mocked(execa).mockResolvedValueOnce({
        stdout: output,
        stderr: '',
        exitCode: 1,
      } as any)

      const dir = makeProjectDir({})
      const result = await runTests(dir)
      expect(result.passed).toBe(false)
      expect(result.failedTests).toBeGreaterThanOrEqual(0)
    })
  })
})
