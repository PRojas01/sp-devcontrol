export interface AutofixSuggestion {
  controlId: string
  filepath: string
  line: number
  original: string
  replacement: string
  description: string
}

const SECRET_ENV_MAP: Array<{ pattern: RegExp; envName: string }> = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/, envName: 'OPENAI_API_KEY' },
  { pattern: /AKIA[0-9A-Z]{16}/, envName: 'AWS_ACCESS_KEY_ID' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, envName: 'GITHUB_TOKEN' },
  { pattern: /(?:api[_-]?key\s*[=:]\s*["'])([a-zA-Z0-9_\-]{8,})(["'])/i, envName: 'API_KEY' },
  { pattern: /(?:secret\s*[=:]\s*["'])([a-zA-Z0-9_\-]{8,})(["'])/i, envName: 'SECRET' },
  { pattern: /(?:password\s*=\s*["'])([^"']{3,})(["'])/i, envName: 'PASSWORD' },
]

const CONSOLE_PATTERNS = [
  /console\.(log|warn|error|info)\s*\(/,
]

const ANY_PATTERN = /:\s*any\b/

export function fixHardcodedSecret(line: string, filepath: string, lineNum: number): AutofixSuggestion | null {
  for (const { pattern, envName } of SECRET_ENV_MAP) {
    const match = line.match(pattern)
    if (match) {
      const varName = filepath.split('/').pop()?.replace(/\.\w+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() + '_' + envName
      const replacement = line.replace(match[0], `process.env.${varName}`)
      return {
        controlId: 'sec-secrets',
        filepath,
        line: lineNum,
        original: line.trim(),
        replacement: replacement.trim(),
        description: `Replace hardcoded ${envName} with process.env.${varName}`,
      }
    }
  }
  return null
}

export function fixConsoleLog(line: string, filepath: string, lineNum: number): AutofixSuggestion | null {
  if (filepath.includes('.test.') || filepath.includes('tests/')) return null
  for (const pattern of CONSOLE_PATTERNS) {
    if (pattern.test(line)) {
      const replacement = line.replace(/console\.(log|warn|error|info)\s*\(/, 'logger.$1(')
      return {
        controlId: 'test-no-console',
        filepath,
        line: lineNum,
        original: line.trim(),
        replacement: replacement.trim(),
        description: 'Replace console.log with structured logger',
      }
    }
  }
  return null
}

export function fixAnyType(line: string, filepath: string, lineNum: number): AutofixSuggestion | null {
  if (!filepath.endsWith('.ts') && !filepath.endsWith('.tsx')) return null
  if (ANY_PATTERN.test(line)) {
    const replacement = line.replace(/:\s*any\b/, ': unknown')
    return {
      controlId: 'test-no-any',
      filepath,
      line: lineNum,
      original: line.trim(),
      replacement: replacement.trim(),
      description: 'Replace `any` with `unknown`',
    }
  }
  return null
}

export function suggestAutofixes(
  violations: Array<{ controlId: string; filepath?: string; line?: number; message: string }>,
  fileContents: Map<string, string[]>,
): AutofixSuggestion[] {
  const suggestions: AutofixSuggestion[] = []

  for (const v of violations) {
    if (!v.filepath || v.line === undefined) continue
    const lines = fileContents.get(v.filepath)
    if (!lines || v.line >= lines.length) continue

    const line = lines[v.line]

    if (v.controlId === 'sec-secrets') {
      const fix = fixHardcodedSecret(line, v.filepath, v.line)
      if (fix) suggestions.push(fix)
    }

    if (v.controlId === 'test-no-console') {
      const fix = fixConsoleLog(line, v.filepath, v.line)
      if (fix) suggestions.push(fix)
    }

    if (v.controlId === 'test-no-any') {
      const fix = fixAnyType(line, v.filepath, v.line)
      if (fix) suggestions.push(fix)
    }
  }

  return suggestions
}
