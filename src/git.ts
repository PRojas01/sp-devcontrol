import simpleGit, { SimpleGit } from 'simple-git'
import type { ChangeSet, DevSentinelConfig } from './types.js'

export class GitManager {
  private git: SimpleGit

  constructor(private projectRoot: string) {
    this.git = simpleGit(projectRoot)
  }

  async isRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir'])
      return true
    } catch {
      return false
    }
  }

  async currentBranch(): Promise<string> {
    const status = await this.git.status()
    return status.current ?? 'main'
  }

  async commitApproved(change: ChangeSet, config: DevSentinelConfig): Promise<string> {
    const filesDesc = change.files
      .filter(f => f.eventType !== 'deleted_attempt')
      .map(f => {
        const delta = f.linesAdded > 0 || f.linesRemoved > 0
          ? ` (+${f.linesAdded}/-${f.linesRemoved})`
          : ''
        return `${f.filepath}${delta}`
      })
      .join(', ')

    const depsDesc = change.depsAdded.length > 0
      ? `\nDeps: ${change.depsAdded.join(', ')}`
      : ''

    const message = [
      `${config.git.commitPrefix}(${change.id}): approve changes by ${change.agent}`,
      '',
      `Files: ${filesDesc}${depsDesc}`,
      `Agent: ${change.agent}`,
      `Risk: ${change.riskLevel}`,
      `Session: ${change.sessionId}`,
      `Approved-by: user`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n')

    const filesToAdd = change.files
      .filter(f => f.eventType !== 'deleted_attempt')
      .map(f => f.filepath)

    if (filesToAdd.length === 0) return ''

    await this.git.add(filesToAdd)
    const result = await this.git.commit(message)
    return result.commit
  }

  async saveRejectedBranch(change: ChangeSet, config: DevSentinelConfig): Promise<string> {
    const branchName = `${config.git.rejectedBranchPrefix}/${change.id}`
    try {
      const currentBranch = await this.currentBranch()
      await this.git.checkoutBranch(branchName, currentBranch)

      const filesToAdd = change.files.map(f => f.filepath)
      if (filesToAdd.length > 0) {
        await this.git.add(filesToAdd)
        await this.git.commit(
          `${config.git.commitPrefix}(${change.id}): rejected changes by ${change.agent}\n\nRejected-by: user\nTimestamp: ${new Date().toISOString()}`,
        )
      }

      await this.git.checkout(currentBranch)
      return branchName
    } catch {
      await this.git.checkout(await this.currentBranch()).catch(() => null)
      return ''
    }
  }

  async restoreFiles(filepaths: string[]): Promise<void> {
    if (filepaths.length === 0) return
    await this.git.checkout(['--', ...filepaths])
  }

  async createRestoreCommit(sessionId: string, config: DevSentinelConfig): Promise<string> {
    const message = [
      `${config.git.commitPrefix}(${sessionId}): restore to pre-session state`,
      '',
      `Restore-type: full-session-rollback`,
      `Session: ${sessionId}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n')

    await this.git.add('.')
    const result = await this.git.commit(message, undefined, { '--allow-empty': null })
    return result.commit
  }

  async getLog(limit = 20): Promise<Array<{ hash: string; date: string; message: string; author: string }>> {
    const log = await this.git.log({ maxCount: limit })
    return log.all.map(entry => ({
      hash: entry.hash.slice(0, 8),
      date: entry.date,
      message: entry.message,
      author: entry.author_name,
    }))
  }

  async stashChanges(): Promise<string> {
    await this.git.stash(['push', '-m', 'sp-devcontrol-session-stash'])
    const list = await this.git.stash(['list'])
    return list.split('\n')[0] ?? ''
  }

  async popStash(): Promise<void> {
    await this.git.stash(['pop'])
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status()
    return !status.isClean()
  }
}
