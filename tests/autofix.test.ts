import { describe, expect, it } from 'vitest'
import {
  fixHardcodedSecret,
  fixConsoleLog,
  fixAnyType,
  suggestAutofixes,
} from '../src/autofix.js'

describe('autofix', () => {
  describe('fixHardcodedSecret', () => {
    it('detects and fixes OpenAI API key', () => {
      const line = 'const apiKey = "sk-abc123def456ghi789jkl012"'
      const result = fixHardcodedSecret(line, 'src/config.ts', 10)
      expect(result).not.toBeNull()
      expect(result!.controlId).toBe('sec-secrets')
      expect(result!.description).toContain('OPENAI_API_KEY')
      expect(result!.replacement).toContain('process.env.')
      expect(result!.original).toContain('sk-abc123def456ghi789jkl012')
    })

    it('detects and fixes AWS access key', () => {
      const line = 'awsKey = "AKIA123456789ABCDEFG"'
      const result = fixHardcodedSecret(line, 'src/aws.ts', 5)
      expect(result).not.toBeNull()
      expect(result!.description).toContain('AWS_ACCESS_KEY_ID')
    })

    it('detects and fixes GitHub token', () => {
      const line = 'const token = "ghp_abc123def456ghi789jkl012mno345pqrstu"'
      const result = fixHardcodedSecret(line, 'src/git.ts', 3)
      expect(result).not.toBeNull()
      expect(result!.description).toContain('GITHUB_TOKEN')
    })

    it('detects and fixes api_key pattern', () => {
      const line = 'const api_key = "super-secret-value"'
      const result = fixHardcodedSecret(line, 'src/service.ts', 8)
      expect(result).not.toBeNull()
      expect(result!.description).toContain('API_KEY')
    })

    it('returns null for safe code', () => {
      const line = 'const apiKey = process.env.OPENAI_API_KEY'
      const result = fixHardcodedSecret(line, 'src/config.ts', 10)
      expect(result).toBeNull()
    })

    it('returns null for placeholder strings', () => {
      const line = 'const pw = "your-password-here"'
      const result = fixHardcodedSecret(line, 'src/test.ts', 1)
      expect(result).toBeNull()
    })
  })

  describe('fixConsoleLog', () => {
    it('replaces console.log with logger.log', () => {
      const line = 'console.log("user logged in", userId)'
      const result = fixConsoleLog(line, 'src/service.ts', 15)
      expect(result).not.toBeNull()
      expect(result!.controlId).toBe('test-no-console')
      expect(result!.replacement).toBe('logger.log("user logged in", userId)')
    })

    it('replaces console.error with logger.error', () => {
      const line = 'console.error("failed:", err)'
      const result = fixConsoleLog(line, 'src/service.ts', 20)
      expect(result!.replacement).toBe('logger.error("failed:", err)')
    })

    it('returns null for test files', () => {
      const line = 'console.log("test output")'
      const result = fixConsoleLog(line, 'tests/service.test.ts', 1)
      expect(result).toBeNull()
    })

    it('returns null for non-matching lines', () => {
      const line = 'const x = 42'
      const result = fixConsoleLog(line, 'src/service.ts', 1)
      expect(result).toBeNull()
    })
  })

  describe('fixAnyType', () => {
    it('replaces `: any` with `: unknown`', () => {
      const line = 'function process(data: any): void {'
      const result = fixAnyType(line, 'src/service.ts', 5)
      expect(result).not.toBeNull()
      expect(result!.controlId).toBe('test-no-any')
      expect(result!.replacement).toBe('function process(data: unknown): void {')
    })

    it('returns null for non-TS files', () => {
      const line = 'function process(data: any)'
      const result = fixAnyType(line, 'src/style.css', 1)
      expect(result).toBeNull()
    })

    it('returns null for lines without any type', () => {
      const line = 'function process(data: string): void {'
      const result = fixAnyType(line, 'src/service.ts', 5)
      expect(result).toBeNull()
    })
  })

  describe('suggestAutofixes', () => {
    it('generates suggestions from violations', () => {
      const violations = [
        { controlId: 'sec-secrets', filepath: 'src/config.ts', line: 5, message: 'Hardcoded API key detected' },
        { controlId: 'test-no-console', filepath: 'src/app.ts', line: 10, message: 'console.log in production' },
      ]
      const fileContents = new Map([
        ['src/config.ts', ['', '', '', '', '', 'const key = "sk-abc123def456ghi789jkl012mno"']],
        ['src/app.ts', ['', '', '', '', '', '', '', '', '', '', 'console.log("hi")']],
      ])
      const suggestions = suggestAutofixes(violations, fileContents)
      expect(suggestions.length).toBeGreaterThanOrEqual(1)
      expect(suggestions[0].controlId).toBe('sec-secrets')
    })

    it('skips violations with missing filepath or line', () => {
      const violations = [
        { controlId: 'sec-secrets', filepath: undefined as unknown as string, line: 1, message: 'test' },
        { controlId: 'test-no-console', filepath: 'src/app.ts', line: undefined as unknown as number, message: 'test' },
      ]
      const suggestions = suggestAutofixes(violations, new Map())
      expect(suggestions).toEqual([])
    })
  })
})
