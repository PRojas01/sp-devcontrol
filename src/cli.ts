#!/usr/bin/env node
/**
 * SP-DevControl v2.0.0
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */
import { Command } from 'commander'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { VERSION } from './version.js'
import { join, resolve } from 'path'
import { generateComplianceReport, renderComplianceMarkdown } from './compliance.js'
import { DEFAULT_CONFIG, ensureConfigDir, hasConfig, loadConfig, saveConfig } from './config.js'
import { GitManager } from './git.js'
import { installHooks, uninstallHooks, checkHooksInstalled, renderHookResult } from './hooks.js'
import { buildInjection, writeInjectionFiles } from './injector.js'
import { ensureOperationalDirs, refreshDailySummary, refreshMemoryIndex, refreshSessionDigest } from './memory.js'
import { processChangeBurst, renderBurstSummary } from './monitor.js'
import { DB_PATH, MEMORY_DIR } from './paths.js'
import {
  addProtectedPath,
  addReviewCommand,
  approveCommand,
  evaluateCommandRisk,
  evaluatePathRisk,
  listApprovedCommands,
  listProtectedPaths,
  listReviewCommands,
  removeProtectedPath,
  removeReviewCommand,
  revokeCommand,
} from './policy.js'
import {
  runPreflightChecks,
  runSessionPreflightChecks,
  renderPreflightResult,
} from './preflight.js'
import { initializeControlledProject } from './project_init.js'
import { createSession, generateSessionId } from './session.js'
import {
  createSnapshotFromChangeBefore,
  createSnapshotFromCurrentState,
  rollbackChange,
  rollbackSession,
  snapshotCandidateFilesForSession,
} from './snapshot.js'
import { writeSessionArtifacts } from './session_files.js'
import {
  closeDb,
  getChange,
  getChangesForSession,
  getDb,
  getSession,
  insertApproval,
  insertChecklistItems,
  insertSession,
  insertSessionRequest,
  listApprovals,
  listChecklistItems,
  listSessionRequests,
  listSnapshots,
  revokeApproval,
  updateChangeStatus,
  updateChecklistItem,
  updateSession,
} from './storage.js'
import { evaluateTokenBudget, estimateSessionTokens } from './token_guard.js'
import type { ApprovalRecord, ChangeSet, Session, SessionChecklistItem } from './types.js'
import { runApprovalFlow } from './approval.js'
import { analyzeChanges } from './analyzer.js'
import { runInSandbox } from './wrapper.js'
import inquirer from 'inquirer'
import { validateChangeset } from './validator.js'
import { FileWatcher } from './watcher.js'

// Daemon worker mode: when spawned by startDaemon(), start the API server inline
if (process.argv[2] === '__daemon_worker__') {
  const apiPort = parseInt(process.env['DEVCONTROL_API_PORT'] ?? '7891', 10)
  const apiToken = process.env['DEVCONTROL_API_TOKEN'] || undefined
  import('./api.js').then(({ startApiServer }) => {
    startApiServer(apiPort, apiToken).then(() => {
      process.title = `devcontrol-daemon :${apiPort}`
    }).catch((err: unknown) => {
      process.stderr.write(`Daemon API failed: ${String(err)}\n`)
      process.exit(1)
    })
  })
  // Keep process alive; API server holds the event loop
  process.on('SIGTERM', () => {
    import('./api.js').then(({ stopApiServer }) => stopApiServer()).finally(() => process.exit(0))
  })
}

const program = new Command()
program
  .name('sp-devcontrol')
  .description('SP-DevControl local governance CLI')
  .version(VERSION)
  .option('--verbose', 'Show stack traces on error')

function openDb(projectRoot: string) {
  return getDb(resolve(projectRoot, DB_PATH))
}

function sessionApprovals(projectRoot: string, sessionId?: string): ApprovalRecord[] {
  if (!sessionId) return []
  const db = openDb(projectRoot)
  return listApprovals(db, sessionId)
}

function refreshSessionArtifacts(projectRoot: string, db: ReturnType<typeof openDb>, session: Session): void {
  const requests = listSessionRequests(db, session.id)
  const checklist = listChecklistItems(db, session.id)
  writeSessionArtifacts(projectRoot, session, requests, checklist)
  refreshSessionDigest(projectRoot, session, checklist)
  refreshDailySummary(projectRoot, db)
  refreshMemoryIndex(projectRoot, db)
}

function serializeChange(change: ChangeSet) {
  return {
    id: change.id,
    sessionId: change.sessionId,
    riskLevel: change.riskLevel,
    status: change.status,
    detectedAt: change.detectedAt,
    decisionAt: change.decisionAt,
    decisionMessage: change.decisionMessage,
    commitHash: change.commitHash,
    rejectedBranch: change.rejectedBranch,
    depsAdded: change.depsAdded,
    depsInvalid: change.depsInvalid,
    files: change.files.map(file => ({
      filepath: file.filepath,
      eventType: file.eventType,
      linesAdded: file.linesAdded,
      linesRemoved: file.linesRemoved,
      outOfScope: file.outOfScope,
    })),
    controlViolations: change.controlViolations,
  }
}

program.command('init')
  .description('Initialize SP-DevControl project structure, config, docs and policy base')
  .option('--project-name <name>')
  .action((options) => {
    const projectRoot = process.cwd()
    ensureConfigDir(projectRoot)
    ensureOperationalDirs(projectRoot)
    if (!hasConfig(projectRoot)) {
      const config = {
        ...DEFAULT_CONFIG,
        project: options.projectName ?? projectRoot.split('/').pop() ?? 'project',
      }
      saveConfig(config, projectRoot)
    }
    const summary = initializeControlledProject(projectRoot, {
      project: options.projectName,
    })
    openDb(projectRoot)
    closeDb()

    if (summary.gitPresent) {
      const hookResult = installHooks(projectRoot)
      if (hookResult.installed.length > 0) {
        console.log(`Hooks installed: ${hookResult.installed.join(', ')}`)
      }
    }

    console.log('SP-DevControl initialized.')
    console.log(`Git present: ${summary.gitPresent ? 'yes' : 'no'}`)
    console.log(`Docs created: ${summary.createdDocs.length}`)
    console.log(`Baseline: ${summary.baselinePath}`)
    console.log(`Policy: ${summary.policyPath}`)
    console.log(`\nNext: fill in docs/ with real project design, then run "sp-devcontrol project:check"`)
  })

program.command('project:status')
  .description('Show local governance status for the current project')
  .action(() => {
    const projectRoot = process.cwd()
    const hasGit = existsSync(resolve(projectRoot, '.git'))
    const hasLocalConfig = hasConfig(projectRoot)
    const hasDocs = existsSync(resolve(projectRoot, 'docs'))
    const hasPolicy = existsSync(resolve(projectRoot, '.devcontrol', 'policy.json'))
    const hasBaseline = existsSync(resolve(projectRoot, '.devcontrol', 'baseline.json'))
    const hasMemory = existsSync(resolve(projectRoot, MEMORY_DIR))

    console.log(`Project: ${projectRoot.split('/').pop() ?? 'project'}`)
    console.log(`Git: ${hasGit ? 'present' : 'missing'}`)
    console.log(`Config: ${hasLocalConfig ? 'present' : 'missing'}`)
    console.log(`Docs: ${hasDocs ? 'present' : 'missing'}`)
    console.log(`Policy: ${hasPolicy ? 'present' : 'missing'}`)
    console.log(`Baseline: ${hasBaseline ? 'present' : 'missing'}`)
    console.log(`Memory: ${hasMemory ? 'present' : 'missing'}`)
  })

program.command('policy:path')
  .description('Evaluate risk and protection level for one path')
  .requiredOption('--path <path>')
  .option('--session <id>', 'optional session id for contextual approvals')
  .action((options) => {
    const result = evaluatePathRisk(process.cwd(), options.path, sessionApprovals(process.cwd(), options.session))
    console.log(JSON.stringify(result, null, 2))
    closeDb()
  })

program.command('policy:command')
  .description('Evaluate whether a command should be allowed, reviewed or blocked')
  .requiredOption('--command <command>')
  .option('--session <id>', 'optional session id for contextual approvals')
  .action((options) => {
    const result = evaluateCommandRisk(process.cwd(), options.command, sessionApprovals(process.cwd(), options.session))
    console.log(JSON.stringify(result, null, 2))
    closeDb()
  })

program.command('policy:protected:list')
  .description('List protected path patterns')
  .action(() => {
    const result = listProtectedPaths(process.cwd())
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:protected:add')
  .description('Add one protected path pattern')
  .requiredOption('--pattern <pattern>')
  .action((options) => {
    const result = addProtectedPath(process.cwd(), options.pattern)
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:protected:remove')
  .description('Remove one protected path pattern')
  .requiredOption('--pattern <pattern>')
  .action((options) => {
    const result = removeProtectedPath(process.cwd(), options.pattern)
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:command:approved:list')
  .description('List approved command patterns')
  .action(() => {
    const result = listApprovedCommands(process.cwd())
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:command:review:list')
  .description('List commands that require human review before execution')
  .action(() => {
    const result = listReviewCommands(process.cwd())
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:command:review:add')
  .description('Add a command pattern that requires human review (not blocked, not auto-approved)')
  .requiredOption('--command <command>')
  .action((options) => {
    const result = addReviewCommand(process.cwd(), options.command)
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:command:review:remove')
  .description('Remove a command from the review list')
  .requiredOption('--command <command>')
  .action((options) => {
    const result = removeReviewCommand(process.cwd(), options.command)
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:command:approve')
  .description('Approve one command pattern explicitly')
  .requiredOption('--command <command>')
  .action((options) => {
    const result = approveCommand(process.cwd(), options.command)
    console.log(JSON.stringify(result, null, 2))
  })

program.command('policy:command:revoke')
  .description('Revoke one globally approved command pattern')
  .requiredOption('--command <command>')
  .action((options) => {
    const result = revokeCommand(process.cwd(), options.command)
    console.log(JSON.stringify(result, null, 2))
  })

program.command('session:start')
  .description('Start a governed session and create memory/session artifacts')
  .requiredOption('--objective <text>')
  .option('--agent <agent>', 'agent name', 'claude-code')
  .option('--mode <mode>', 'session mode', 'watch')
  .option('--scope <items...>', 'allowed scope paths')
  .option('--request <text...>', 'user requests to convert into checklist')
  .option('--token-budget <number>', 'session token budget override')
  .option('--skip-preflight', 'Skip preflight checks (registered in audit)', false)
  .action((options) => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)
    ensureOperationalDirs(projectRoot)
    const db = openDb(projectRoot)

    if (!options.skipPreflight) {
      const preflight = runSessionPreflightChecks(projectRoot, db)
      if (!preflight.passed) {
        console.log(renderPreflightResult(preflight))
        console.log('\nSession start blocked. Fix the errors above or use --skip-preflight to bypass.')
        closeDb()
        process.exitCode = 1
        return
      }
    }

    const sessionId = generateSessionId()
    const session = createSession(sessionId, config.project || 'project', options.agent, options.mode)
    session.objective = options.objective
    session.allowedScope = options.scope ?? config.scope.allowed
    session.tokenBudget = options.tokenBudget ? parseInt(options.tokenBudget, 10) : config.memory.sessionTokenBudget
    session.tokenEstimate = 0
    session.status = 'active'
    insertSession(db, session)

    const requests = (options.request ?? [options.objective]).map((requestText: string) => ({
      sessionId,
      requestText,
      source: 'user' as const,
    }))
    for (const request of requests) insertSessionRequest(db, request)

    const checklist: SessionChecklistItem[] = requests.map((request: { requestText: string }, idx: number) => ({
      sessionId,
      itemText: request.requestText,
      acceptanceCriteria: idx === 0 ? 'Objetivo principal cubierto segun la solicitud del usuario' : 'Solicitud derivada completada y verificada',
      status: 'pending',
      evidence: '',
      notes: '',
    }))
    insertChecklistItems(db, checklist)

    refreshSessionArtifacts(projectRoot, db, session)
    closeDb()

    console.log(`Session started: ${sessionId}`)
  })

program.command('session:check')
  .description('Estimate session token usage and refresh context when near budget')
  .requiredOption('--session <id>')
  .action((options) => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    const requests = listSessionRequests(db, session.id)
    const checklist = listChecklistItems(db, session.id)
    const memoryDir = resolve(projectRoot, MEMORY_DIR)
    const memoryBlobs = existsSync(memoryDir)
      ? readdirSync(memoryDir)
        .filter(name => name.endsWith('.md'))
        .map(name => readFileSync(join(memoryDir, name), 'utf-8'))
      : []

    const estimate = estimateSessionTokens(session, requests, checklist, memoryBlobs)
    session.tokenEstimate = estimate
    const status = evaluateTokenBudget(session, estimate, config.memory.tokenAlertThreshold)
    updateSession(db, session)

    if (status.nearLimit) {
      refreshSessionArtifacts(projectRoot, db, session)
      console.log(`Token alert: ${status.estimate}/${status.budget} (${Math.round(status.percentUsed * 100)}%)`)
      console.log('Context, memory and session files refreshed.')
    } else {
      console.log(`Token status OK: ${status.estimate}/${status.budget} (${Math.round(status.percentUsed * 100)}%)`)
    }

    closeDb()
  })

program.command('session:checklist:update')
  .description('Update one checklist item and refresh session artifacts')
  .requiredOption('--session <id>')
  .requiredOption('--item-id <number>')
  .requiredOption('--status <status>')
  .option('--evidence <text>')
  .option('--notes <text>')
  .action((options) => {
    const projectRoot = process.cwd()
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    const itemId = parseInt(options.itemId, 10)
    updateChecklistItem(db, itemId, options.status, options.evidence, options.notes)
    refreshSessionArtifacts(projectRoot, db, session)
    closeDb()

    console.log(`Checklist item updated: ${itemId}`)
  })

program.command('session:changes:list')
  .description('List detected changes for a session')
  .requiredOption('--session <id>')
  .action((options) => {
    const db = openDb(process.cwd())
    const changes = getChangesForSession(db, options.session).map(change => ({
      id: change.id,
      riskLevel: change.riskLevel,
      status: change.status,
      fileCount: change.files.length,
      files: change.files.map(file => file.filepath),
      detectedAt: change.detectedAt,
      controlViolations: change.controlViolations.length,
    }))
    console.log(JSON.stringify(changes, null, 2))
    closeDb()
  })

program.command('session:change:show')
  .description('Show one detected change with details')
  .requiredOption('--change-id <id>')
  .action((options) => {
    const db = openDb(process.cwd())
    const change = getChange(db, options.changeId)
    if (!change) throw new Error(`Change not found: ${options.changeId}`)
    console.log(JSON.stringify(serializeChange(change), null, 2))
    closeDb()
  })

program.command('session:change:approve')
  .description('Approve one detected change via interactive TUI flow, create snapshot and optionally commit it')
  .requiredOption('--change-id <id>')
  .option('--message <text>', 'decision message', 'approved from CLI')
  .option('--yes', 'Skip interactive TUI and approve immediately (non-interactive / CI mode)', false)
  .action(async (options) => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)
    const db = openDb(projectRoot)
    const change = getChange(db, options.changeId)
    if (!change) throw new Error(`Change not found: ${options.changeId}`)
    const session = getSession(db, change.sessionId)
    if (!session) throw new Error(`Session not found: ${change.sessionId}`)

    const analysis = analyzeChanges(change.files, config, projectRoot)
    const validation = validateChangeset(change.files, config)
    const decision = options.yes
      ? { action: 'approve' as const, message: options.message }
      : await runApprovalFlow(change, analysis, validation, config)

    if (decision.action === 'reject') {
      createSnapshotFromCurrentState(
        projectRoot,
        db,
        session,
        `pre-reject-${change.id}`,
        change.files.map(file => file.filepath),
        'rollback',
        change.id,
      )
      const restoredFiles = rollbackChange(projectRoot, change)

      let rejectedBranch = ''
      const git = new GitManager(projectRoot)
      if (await git.isRepo()) {
        try {
          rejectedBranch = await git.saveRejectedBranch(change, config)
        } catch {
          rejectedBranch = ''
        }
      }

      updateChangeStatus(db, change.id, 'rejected', undefined, rejectedBranch, decision.message || options.message)
      session.rejected += 1
      updateSession(db, session)
      refreshSessionArtifacts(projectRoot, db, session)
      closeDb()

      console.log(JSON.stringify({ changeId: change.id, status: 'rejected', restoredFiles, rejectedBranch }, null, 2))
      return
    }

    createSnapshotFromChangeBefore(projectRoot, db, session, change, `pre-approve-${change.id}`)

    let commitHash = ''
    const git = new GitManager(projectRoot)
    if (config.rules.autoCommit && await git.isRepo()) {
      try {
        commitHash = await git.commitApproved(change, config)
      } catch {
        commitHash = ''
      }
    }

    const finalStatus = decision.action === 'approve_partial' ? 'partial' : 'approved'
    updateChangeStatus(db, change.id, finalStatus, commitHash, undefined, decision.message || options.message)
    session.approved += 1
    updateSession(db, session)
    refreshSessionArtifacts(projectRoot, db, session)
    closeDb()

    console.log(JSON.stringify({ changeId: change.id, status: finalStatus, commitHash }, null, 2))
  })

program.command('session:change:reject')
  .description('Reject one detected change, rollback its files and persist rejection metadata')
  .requiredOption('--change-id <id>')
  .option('--reason <text>', 'rejection reason', 'rejected from CLI')
  .action(async (options) => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)
    const db = openDb(projectRoot)
    const change = getChange(db, options.changeId)
    if (!change) throw new Error(`Change not found: ${options.changeId}`)
    const session = getSession(db, change.sessionId)
    if (!session) throw new Error(`Session not found: ${change.sessionId}`)

    const { confirmReject } = await inquirer.prompt<{ confirmReject: boolean }>([{
      type: 'confirm',
      name: 'confirmReject',
      message: `Reject change ${change.id} (${change.riskLevel}, ${change.files.length} files)? This will rollback all affected files.`,
      default: false,
    }])
    if (!confirmReject) {
      closeDb()
      console.log('Rejection cancelled.')
      return
    }

    createSnapshotFromCurrentState(
      projectRoot,
      db,
      session,
      `pre-reject-${change.id}`,
      change.files.map(file => file.filepath),
      'rollback',
      change.id,
    )
    const restoredFiles = rollbackChange(projectRoot, change)

    let rejectedBranch = ''
    const git = new GitManager(projectRoot)
    if (await git.isRepo()) {
      try {
        rejectedBranch = await git.saveRejectedBranch(change, config)
      } catch {
        rejectedBranch = ''
      }
    }

    updateChangeStatus(db, change.id, 'rejected', undefined, rejectedBranch, options.reason)
    session.rejected += 1
    updateSession(db, session)
    refreshSessionArtifacts(projectRoot, db, session)
    closeDb()

    console.log(JSON.stringify({ changeId: change.id, status: 'rejected', restoredFiles, rejectedBranch }, null, 2))
  })

program.command('snapshot:create')
  .description('Create a manual snapshot for a session from current file state')
  .requiredOption('--session <id>')
  .option('--label <text>', 'snapshot label', 'manual-snapshot')
  .option('--path <items...>', 'explicit file paths to include')
  .action((options) => {
    const projectRoot = process.cwd()
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    const filepaths = options.path && options.path.length > 0
      ? options.path
      : snapshotCandidateFilesForSession(db, session.id)
    const snapshot = createSnapshotFromCurrentState(projectRoot, db, session, options.label, filepaths)
    console.log(JSON.stringify(snapshot, null, 2))
    closeDb()
  })

program.command('session:snapshots:list')
  .description('List snapshots for a session')
  .requiredOption('--session <id>')
  .action((options) => {
    const db = openDb(process.cwd())
    console.log(JSON.stringify(listSnapshots(db, options.session), null, 2))
    closeDb()
  })

program.command('session:rollback')
  .description('Rollback one change or the whole session using captured before-state')
  .requiredOption('--session <id>')
  .option('--change-id <id>')
  .option('--label <text>', 'snapshot label before rollback', 'pre-rollback')
  .action((options) => {
    const projectRoot = process.cwd()
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    if (options.changeId) {
      const change = getChange(db, options.changeId)
      if (!change) throw new Error(`Change not found: ${options.changeId}`)
      if (change.sessionId !== options.session) throw new Error(`Change ${change.id} does not belong to session ${options.session} — cross-session rollback blocked for security`)
      createSnapshotFromCurrentState(
        projectRoot,
        db,
        session,
        `${options.label}-${change.id}`,
        change.files.map(file => file.filepath),
        'rollback',
        change.id,
      )
      const restoredFiles = rollbackChange(projectRoot, change)
      updateChangeStatus(db, change.id, 'rejected', undefined, undefined, 'rolled back from CLI')
      session.rejected += 1
      updateSession(db, session)
      refreshSessionArtifacts(projectRoot, db, session)
      closeDb()
      console.log(JSON.stringify({ scope: 'change', changeId: change.id, restoredFiles }, null, 2))
      return
    }

    const changes = getChangesForSession(db, session.id)
    const filepaths = [...new Set(changes.flatMap(change => change.files.map(file => file.filepath)))]
    createSnapshotFromCurrentState(projectRoot, db, session, `${options.label}-${session.id}`, filepaths, 'rollback')
    const restoredFiles = rollbackSession(projectRoot, changes)
    refreshSessionArtifacts(projectRoot, db, session)
    closeDb()
    console.log(JSON.stringify({ scope: 'session', sessionId: session.id, restoredFiles }, null, 2))
  })

program.command('session:approval:list')
  .description('List active approvals for a session')
  .requiredOption('--session <id>')
  .action((options) => {
    const db = openDb(process.cwd())
    console.log(JSON.stringify(listApprovals(db, options.session), null, 2))
    closeDb()
  })

program.command('session:approval:grant')
  .description('Grant a session approval for one command, path or change target')
  .requiredOption('--session <id>')
  .requiredOption('--type <type>')
  .requiredOption('--target <target>')
  .option('--reason <text>', 'approval rationale', 'manual approval from CLI')
  .action((options) => {
    const db = openDb(process.cwd())
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    const approval = insertApproval(db, {
      sessionId: options.session,
      approvalType: options.type,
      target: options.target,
      scope: 'session',
      reason: options.reason,
      createdBy: 'user',
    })
    console.log(JSON.stringify(approval, null, 2))
    closeDb()
  })

program.command('session:approval:revoke')
  .description('Revoke one session approval by id')
  .requiredOption('--approval-id <number>')
  .action((options) => {
    const db = openDb(process.cwd())
    const approvalId = parseInt(options.approvalId, 10)
    const approval = revokeApproval(db, approvalId)
    if (!approval) throw new Error(`Approval not found: ${approvalId}`)
    console.log(JSON.stringify(approval, null, 2))
    closeDb()
  })

program.command('watch:start')
  .description('Start file monitoring for one active session in the current project')
  .requiredOption('--session <id>')
  .action(async (options) => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)
    ensureOperationalDirs(projectRoot)
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    const watcher = new FileWatcher(projectRoot, config, async (files) => {
      const currentSession = getSession(db, session.id)
      if (!currentSession) return

      const result = processChangeBurst(projectRoot, db, currentSession, files, config)
      refreshSessionArtifacts(projectRoot, db, currentSession)
      console.log('\n' + renderBurstSummary(result) + '\n')
    })

    watcher.start()
    console.log(`Watcher attached to session: ${session.id}`)
    console.log('Press Ctrl+C to stop monitoring.')

    await new Promise<void>((resolveStop) => {
      const stop = () => {
        watcher.stop()
        closeDb()
        console.log('\nWatcher stopped.')
        resolveStop()
      }
      process.once('SIGINT', stop)
      process.once('SIGTERM', stop)
      if (process.platform === 'win32') {
        process.once('SIGHUP', stop)
      }
    })
  })

program.command('session:close')
  .description('Close a session and refresh memory/session artifacts')
  .requiredOption('--session <id>')
  .option('--status <status>', 'completed | partial | blocked', 'completed')
  .action((options) => {
    const projectRoot = process.cwd()
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    session.endedAt = new Date().toISOString()
    session.status = options.status
    updateSession(db, session)
    refreshSessionArtifacts(projectRoot, db, session)
    closeDb()

    console.log(`Session closed: ${session.id}`)
  })

// ─── Preflight & Project Health ─────────────────────────────────────────────

program.command('project:check')
  .description('Run full preflight checks and show project health, phase and blockers')
  .action(() => {
    const projectRoot = process.cwd()
    let db
    try { db = openDb(projectRoot) } catch { db = undefined }
    const result = runPreflightChecks(projectRoot, db ?? undefined)
    console.log(renderPreflightResult(result))
    if (db) closeDb()
    process.exitCode = result.passed ? 0 : 1
  })

// ─── Git Hooks ──────────────────────────────────────────────────────────────

program.command('hooks:install')
  .description('Install SP-DevControl Git hooks (pre-commit, pre-push, commit-msg)')
  .option('--force', 'Overwrite existing non-managed hooks', false)
  .action((options) => {
    const result = installHooks(process.cwd(), options.force)
    console.log(renderHookResult(result))
  })

program.command('hooks:uninstall')
  .description('Remove SP-DevControl Git hooks')
  .action(() => {
    const result = uninstallHooks(process.cwd())
    console.log(renderHookResult(result))
  })

program.command('hooks:status')
  .description('Show which SP-DevControl hooks are installed')
  .action(() => {
    const result = checkHooksInstalled(process.cwd())
    if (result.installed.length > 0) {
      console.log('Installed:')
      for (const h of result.installed) console.log(`  ✓ ${h}`)
    }
    if (result.missing.length > 0) {
      console.log('Missing:')
      for (const h of result.missing) console.log(`  ✖ ${h}`)
    }
  })

// ─── Inject Agent Rules ─────────────────────────────────────────────────────

program.command('inject')
  .description('Generate CLAUDE.md, .cursorrules, copilot-instructions from active controls')
  .action(() => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)
    const injection = buildInjection(config)
    const written = writeInjectionFiles(injection, projectRoot, config)
    console.log('Agent rule files generated:')
    for (const file of written) console.log(`  ✓ ${file}`)
  })

// ─── Compliance Report ──────────────────────────────────────────────────────

program.command('report:compliance')
  .description('Generate a compliance report with controls, norms, sessions and violations')
  .option('--output <path>', 'Write report to a markdown file')
  .action((options) => {
    const projectRoot = process.cwd()
    const db = openDb(projectRoot)
    const report = generateComplianceReport(projectRoot, db)
    const markdown = renderComplianceMarkdown(report)

    if (options.output) {
      writeFileSync(resolve(projectRoot, options.output), markdown, 'utf-8')
      console.log(`Compliance report written to: ${options.output}`)
    } else {
      console.log(markdown)
    }

    closeDb()
  })

program.command('report:session')
  .description('Generate a detailed session report with changes, approvals and metrics')
  .requiredOption('--session <id>')
  .option('--output <path>', 'Write report to a markdown file')
  .action((options) => {
    const projectRoot = process.cwd()
    const db = openDb(projectRoot)
    const session = getSession(db, options.session)
    if (!session) throw new Error(`Session not found: ${options.session}`)

    const changes = getChangesForSession(db, session.id)
    const approvals = listApprovals(db, session.id, false)
    const snapshots = listSnapshots(db, session.id)
    const checklist = listChecklistItems(db, session.id)

    const totalViolations = changes.reduce((s, c) => s + c.controlViolations.length, 0)
    const highRisk = changes.filter(c => c.riskLevel === 'HIGH').length
    const approved = changes.filter(c => c.status === 'approved').length
    const rejected = changes.filter(c => c.status === 'rejected').length
    const pending = changes.filter(c => c.status === 'pending').length

    const lines = [
      `# Session Report — ${session.id}`,
      ``,
      `**Project:** ${session.project}`,
      `**Agent:** ${session.agent}`,
      `**Objective:** ${session.objective ?? 'N/A'}`,
      `**Status:** ${session.status ?? 'active'}`,
      `**Started:** ${session.startedAt}`,
      `**Ended:** ${session.endedAt ?? 'In progress'}`,
      ``,
      `## Metrics`,
      ``,
      `| Metric | Value |`,
      `|---|---|`,
      `| Changes detected | ${changes.length} |`,
      `| Approved | ${approved} |`,
      `| Rejected | ${rejected} |`,
      `| Pending | ${pending} |`,
      `| HIGH risk | ${highRisk} |`,
      `| Violations | ${totalViolations} |`,
      `| Approvals granted | ${approvals.length} |`,
      `| Snapshots | ${snapshots.length} |`,
      `| Token estimate | ${session.tokenEstimate ?? 0}/${session.tokenBudget ?? 0} |`,
      ``,
      `## Checklist`,
      ``,
      `| Item | Status | Evidence |`,
      `|---|---|---|`,
      ...checklist.map(item => `| ${item.itemText} | ${item.status} | ${item.evidence ?? ''} |`),
      ``,
      `## Changes`,
      ``,
      `| ID | Risk | Status | Files | Violations |`,
      `|---|---|---|---|---|`,
      ...changes.map(c => `| ${c.id} | ${c.riskLevel} | ${c.status} | ${c.files.map(f => f.filepath).join(', ')} | ${c.controlViolations.length} |`),
      ``,
      `---`,
      `_Generated by SP-DevControl ${VERSION} · ${new Date().toISOString()}_`,
    ]

    const markdown = lines.join('\n')
    if (options.output) {
      writeFileSync(resolve(projectRoot, options.output), markdown, 'utf-8')
      console.log(`Session report written to: ${options.output}`)
    } else {
      console.log(markdown)
    }
    closeDb()
  })

// ─── Daemon ─────────────────────────────────────────────────────────────────

const daemonCmd = new Command('daemon').description('Manage the DevControl background daemon')

daemonCmd
  .command('start')
  .description('Start daemon')
  .action(async () => {
    try {
      const { startDaemon } = await import('./daemon.js')
      await startDaemon()
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

daemonCmd
  .command('stop')
  .description('Stop daemon')
  .action(async () => {
    try {
      const { stopDaemon } = await import('./daemon.js')
      await stopDaemon()
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

daemonCmd
  .command('status')
  .description('Show daemon status')
  .action(async () => {
    try {
      const { getDaemonStatus } = await import('./daemon.js')
      const status = await getDaemonStatus()
      if (status.running) {
        console.log(`Daemon running  PID ${status.pid} | API :${status.apiPort} | WS :${status.wsPort}`)
        if (status.startedAt) console.log(`  Started: ${new Date(status.startedAt).toLocaleString()}`)
        console.log(`  Projects watched: ${status.projectsWatched}`)
      } else {
        console.log('Daemon not running')
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

program.addCommand(daemonCmd)

// ─── MCP Server ──────────────────────────────────────────────────────────────

program
  .command('mcp:serve')
  .description('Start MCP server (HTTP/SSE) for editor integration')
  .option('--port <port>', 'Port (default 7893)', '7893')
  .action(async (opts: { port: string }) => {
    try {
      const { serveMcp } = await import('./mcp.js')
      await serveMcp({ port: parseInt(opts.port, 10) })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

program
  .command('mcp:stdio')
  .description('Start MCP server in stdio mode (for claude mcp add)')
  .action(async () => {
    try {
      const { serveStdio } = await import('./mcp.js')
      await serveStdio()
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

// ─── Skill Generate ──────────────────────────────────────────────────────────

program
  .command('skill:generate')
  .description('Generate skill/tool files for agentic editors')
  .option('--editor <editor>', 'Target editor: claude|opencode|cursor|windsurf|copilot|all', 'all')
  .option('--mcp-port <port>', 'MCP server port for config files', '7893')
  .action(async (opts: { editor: string; mcpPort: string }) => {
    try {
      const projectRoot = process.cwd()
      const { loadConfig, hasConfig } = await import('./config.js')
      if (!hasConfig()) {
        console.error('No DevControl config found. Run: devcontrol init')
        process.exit(1)
      }
      const config = loadConfig()
      const { writeSkills } = await import('./skill.js')
      const written = writeSkills(projectRoot, config, opts.editor as import('./skill.js').EditorTarget, parseInt(opts.mcpPort, 10))
      written.forEach(f => console.log(`  wrote  ${f}`))
      console.log(`\nSkills generated for: ${opts.editor} (${written.length} files)`)
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  })

// ─── Storage Backend ─────────────────────────────────────────────────────────

program
  .command('storage:backend')
  .description('Set storage backend: json (default) or sqlite')
  .argument('<backend>', 'json | sqlite')
  .action(async (backend: string) => {
    if (backend !== 'json' && backend !== 'sqlite') {
      console.error('Backend must be "json" or "sqlite"')
      process.exit(1)
    }
    if (!hasConfig()) {
      console.error('No DevControl config found. Run: devcontrol init')
      process.exit(1)
    }
    const config = loadConfig()
    ;(config as unknown as Record<string, unknown>).storageBackend = backend
    saveConfig(config)
    console.log(`Storage backend set to: ${backend}`)
    if (backend === 'sqlite') {
      console.log('Tip: existing data in .devcontrol/storage/devcontrol.db.json will not be migrated automatically.')
      console.log('Run: devcontrol storage:migrate to copy existing data to SQLite.')
    }
  })

program.command('agent:run')
  .description('Run an AI agent in a sandboxed environment and capture changes')
  .requiredOption('--agent <name>', 'agent name (claude, opencode, codex, gemini)')
  .requiredOption('--prompt <text>', 'prompt to send to the agent')
  .option('--output <path>', 'save sandbox result JSON to file')
  .option('--skip-config-check', 'Skip editor config preflight validation', false)
  .action(async (options) => {
    const projectRoot = process.cwd()
    const config = loadConfig(projectRoot)

    if (!options.skipConfigCheck) {
      validateEditorConfig(projectRoot, options.agent)
    }

    const result = await runInSandbox(options.agent, options.prompt, projectRoot, config)
    const output = JSON.stringify(result, null, 2)
    if (options.output) {
      writeFileSync(resolve(projectRoot, options.output), output, 'utf-8')
      console.log(`Sandbox result written to: ${options.output}`)
    } else {
      console.log(output)
    }
  })

function validateEditorConfig(projectRoot: string, agent: string): void {
  const configPaths: Record<string, string> = {
    opencode: join(projectRoot, 'opencode.json'),
    claude: join(projectRoot, '.claude', 'settings.json'),
    codex: join(projectRoot, 'codex.json'),
  }
  const configPath = configPaths[agent]
  if (!configPath || !existsSync(configPath)) return

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>

    if (agent === 'opencode') {
      const issues: string[] = []
      if ('mcpServers' in raw) {
        issues.push('Use "mcp" instead of "mcpServers" (opencode v1+ schema)')
      }
      if (raw.mcp && typeof raw.mcp === 'object') {
        for (const [key, srv] of Object.entries(raw.mcp as Record<string, unknown>)) {
          if (typeof srv === 'object' && srv !== null) {
            const s = srv as Record<string, unknown>
            if (s.type === 'sse') issues.push(`mcp.${key}: use type "remote" not "sse"`)
            if (s.type === 'remote' && !('enabled' in s)) issues.push(`mcp.${key}: missing required field "enabled"`)
          }
        }
      }
      if (raw.model !== undefined && typeof raw.model !== 'string') {
        issues.push('"model" must be a string (e.g. "opencode/deepseek-v4-flash-free"), not an object')
      }
      if (issues.length > 0) {
        console.warn(`⚠ opencode.json schema issues detected (run devcontrol inject to regenerate):\n${issues.map(i => `  • ${i}`).join('\n')}`)
      }
    }
  } catch {
    console.warn(`⚠ Could not parse ${configPath} — skipping config preflight`)
  }
}

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Error: ${message}`)
  if (program.opts().verbose && error instanceof Error) {
    console.error(error.stack)
  }
  closeDb()
  process.exitCode = 1
})
