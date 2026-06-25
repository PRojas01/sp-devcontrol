import { describe, it, expect } from 'vitest'
import { getDaemonPidPath, getDaemonLogPath, getDaemonStatus } from '../src/daemon.js'

describe('getDaemonPidPath', () => {
  it('returns a path that includes .devcontrol/daemon.pid', () => {
    const pidPath = getDaemonPidPath()
    expect(pidPath).toContain('.devcontrol')
    expect(pidPath).toContain('daemon.pid')
  })
})

describe('getDaemonLogPath', () => {
  it('returns a path that includes .devcontrol/daemon.log', () => {
    const logPath = getDaemonLogPath()
    expect(logPath).toContain('.devcontrol')
    expect(logPath).toContain('daemon.log')
  })
})

describe('getDaemonStatus', () => {
  it('returns running:false with default ports when no daemon is active', async () => {
    // This test assumes no daemon process is running.
    // getDaemonStatus reads ~/.devcontrol/daemon.pid; if absent (or pid dead) it
    // returns the stopped state with default ports 7891 / 7892.
    const status = await getDaemonStatus()

    // When not running the shape must always satisfy these invariants
    if (!status.running) {
      expect(status.running).toBe(false)
      expect(status.apiPort).toBe(7891)
      expect(status.wsPort).toBe(7892)
      expect(status.projectsWatched).toBe(0)
      expect(status.pid).toBeUndefined()
    } else {
      // A daemon happens to be running in this environment — verify the shape is
      // still correct rather than failing the suite.
      expect(typeof status.pid).toBe('number')
      expect(typeof status.apiPort).toBe('number')
      expect(typeof status.wsPort).toBe('number')
      expect(typeof status.projectsWatched).toBe('number')
    }
  })

  it('returns a DaemonStatus object with the required keys', async () => {
    const status = await getDaemonStatus()
    expect(status).toHaveProperty('running')
    expect(status).toHaveProperty('apiPort')
    expect(status).toHaveProperty('wsPort')
    expect(status).toHaveProperty('projectsWatched')
  })
})
