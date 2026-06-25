import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'
import { safeChmod } from './platform.js'

const HOOK_MARKER = '# SP-DevControl managed hook'

const PRE_COMMIT_HOOK = `#!/bin/sh
${HOOK_MARKER}
# Blocks commits when HIGH-risk changes exist without approval.
# Installed by: sp-devcontrol hooks:install

DB_PATH=".devcontrol/storage/devcontrol.db.json"

if [ ! -f "$DB_PATH" ]; then
  exit 0
fi

PENDING_HIGH=$(node -e "
  try {
    const db = JSON.parse(require('fs').readFileSync('$DB_PATH', 'utf-8'));
    const pending = (db.changes || []).filter(c =>
      c.status === 'pending' && (c.riskLevel === 'HIGH' || c.controlViolations.some(v => v.severity === 'error'))
    );
    if (pending.length > 0) {
      console.log('BLOCKED');
      pending.forEach(c => console.error('  [' + c.riskLevel + '] ' + c.id + ' — ' + c.files.map(f => f.filepath).join(', ')));
    }
  } catch(e) { /* allow commit if DB unreadable */ }
" 2>&1)

if echo "$PENDING_HIGH" | grep -q "BLOCKED"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  SP-DevControl: COMMIT BLOCKED                             ║"
  echo "║  HIGH-risk changes detected without approval.              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "$PENDING_HIGH" | grep -v "BLOCKED"
  echo ""
  echo "To approve:  sp-devcontrol session:change:approve --change-id <id>"
  echo "To reject:   sp-devcontrol session:change:reject --change-id <id>"
  echo "To bypass:   git commit --no-verify  (registered in audit)"
  echo ""
  exit 1
fi
`

const PRE_PUSH_HOOK = `#!/bin/sh
${HOOK_MARKER}
# Blocks pushes when unapproved changes or open sessions exist.
# Installed by: sp-devcontrol hooks:install

DB_PATH=".devcontrol/storage/devcontrol.db.json"

if [ ! -f "$DB_PATH" ]; then
  exit 0
fi

ISSUES=$(node -e "
  try {
    const db = JSON.parse(require('fs').readFileSync('$DB_PATH', 'utf-8'));
    const pending = (db.changes || []).filter(c => c.status === 'pending');
    const openSessions = (db.sessions || []).filter(s => s.status === 'active' || (!s.status && !s.endedAt));
    const issues = [];
    if (pending.length > 0) issues.push(pending.length + ' unapproved change(s)');
    if (openSessions.length > 0) issues.push(openSessions.length + ' open session(s)');
    if (issues.length > 0) {
      console.log('BLOCKED');
      issues.forEach(i => console.error('  - ' + i));
    }
  } catch(e) { /* allow push if DB unreadable */ }
" 2>&1)

if echo "$ISSUES" | grep -q "BLOCKED"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  SP-DevControl: PUSH BLOCKED                               ║"
  echo "║  Unresolved governance issues detected.                    ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "$ISSUES" | grep -v "BLOCKED"
  echo ""
  echo "Resolve all pending changes and close sessions before pushing."
  echo "To bypass:   git push --no-verify  (registered in audit)"
  echo ""
  exit 1
fi
`

const COMMIT_MSG_HOOK = `#!/bin/sh
${HOOK_MARKER}
# Validates commit message follows conventional commits format.
# Installed by: sp-devcontrol hooks:install

MSG_FILE="$1"
MSG=$(head -1 "$MSG_FILE")

# Allow merge commits and SP-DevControl auto-commits
if echo "$MSG" | grep -qE "^(Merge |sp-devcontrol)"; then
  exit 0
fi

if ! echo "$MSG" | grep -qE "^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(!)?(\([a-zA-Z0-9_-]+\))?: .+"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  SP-DevControl: INVALID COMMIT MESSAGE                     ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Expected: type(scope): description"
  echo "  Types:    feat, fix, chore, docs, refactor, test, style, perf, ci, build"
  echo "  Example:  feat(auth): add session token refresh"
  echo ""
  echo "  Your message: $MSG"
  echo ""
  exit 1
fi
`

export interface HookInstallResult {
  installed: string[]
  skipped: string[]
  errors: string[]
}

export function installHooks(projectRoot: string, force: boolean = false): HookInstallResult {
  const gitDir = resolve(projectRoot, '.git')
  if (!existsSync(gitDir)) {
    return { installed: [], skipped: [], errors: ['No .git directory found. Initialize Git first.'] }
  }

  const hooksDir = join(gitDir, 'hooks')
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true })

  const hooks: Array<{ name: string; content: string }> = [
    { name: 'pre-commit', content: PRE_COMMIT_HOOK },
    { name: 'pre-push', content: PRE_PUSH_HOOK },
    { name: 'commit-msg', content: COMMIT_MSG_HOOK },
  ]

  const result: HookInstallResult = { installed: [], skipped: [], errors: [] }

  for (const hook of hooks) {
    const hookPath = join(hooksDir, hook.name)
    if (existsSync(hookPath) && !force) {
      const existing = readFileSync(hookPath, 'utf-8')
      if (!existing.includes(HOOK_MARKER)) {
        result.skipped.push(`${hook.name} (existing non-managed hook — use --force to overwrite)`)
        continue
      }
    }
    try {
      writeFileSync(hookPath, hook.content, 'utf-8')
      safeChmod(hookPath, 0o755)
      result.installed.push(hook.name)
    } catch (err) {
      result.errors.push(`${hook.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

export function uninstallHooks(projectRoot: string): HookInstallResult {
  const hooksDir = join(resolve(projectRoot, '.git'), 'hooks')
  const result: HookInstallResult = { installed: [], skipped: [], errors: [] }

  for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
    const hookPath = join(hooksDir, name)
    if (!existsSync(hookPath)) {
      result.skipped.push(`${name} (not found)`)
      continue
    }
    const content = readFileSync(hookPath, 'utf-8')
    if (!content.includes(HOOK_MARKER)) {
      result.skipped.push(`${name} (not managed by SP-DevControl)`)
      continue
    }
    try {
      rmSync(hookPath)
      result.installed.push(name)
    } catch (err) {
      result.errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

export function checkHooksInstalled(projectRoot: string): { installed: string[]; missing: string[] } {
  const hooksDir = join(resolve(projectRoot, '.git'), 'hooks')
  const installed: string[] = []
  const missing: string[] = []

  for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
    const hookPath = join(hooksDir, name)
    if (existsSync(hookPath)) {
      const content = readFileSync(hookPath, 'utf-8')
      if (content.includes(HOOK_MARKER)) {
        installed.push(name)
      } else {
        missing.push(`${name} (exists but not managed)`)
      }
    } else {
      missing.push(name)
    }
  }

  return { installed, missing }
}

export function renderHookResult(result: HookInstallResult): string {
  const lines: string[] = []
  if (result.installed.length > 0) {
    lines.push(chalk.green('Installed:'))
    for (const h of result.installed) lines.push(chalk.green(`  ✓ ${h}`))
  }
  if (result.skipped.length > 0) {
    lines.push(chalk.yellow('Skipped:'))
    for (const h of result.skipped) lines.push(chalk.yellow(`  ⚠ ${h}`))
  }
  if (result.errors.length > 0) {
    lines.push(chalk.red('Errors:'))
    for (const h of result.errors) lines.push(chalk.red(`  ✖ ${h}`))
  }
  return lines.join('\n')
}
