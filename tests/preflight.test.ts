import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { runPreflightChecks, runSessionPreflightChecks, detectProjectPhase } from '../src/preflight.js'
import { initializeControlledProject } from '../src/project_init.js'
import { DB_PATH } from '../src/paths.js'
import { getDb, closeDb, insertSession } from '../src/storage.js'
import { createSession } from '../src/session.js'

function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sp-devcontrol-preflight-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

describe('preflight checks', () => {
  it('detects uninitialized project', () => {
    const dir = tempProject()
    const result = runPreflightChecks(dir)
    expect(result.phase).toBe('uninitialized')
    const configCheck = result.checks.find(c => c.id === 'config-exists')
    expect(configCheck?.passed).toBe(false)
    rmSync(dir, { recursive: true, force: true })
  })

  it('detects initialized project with placeholder docs', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test' })
    const result = runPreflightChecks(dir)
    expect(result.phase).toBe('initialized')
    const docChecks = result.checks.filter(c => c.id.startsWith('doc-content-'))
    const placeholders = docChecks.filter(c => !c.passed)
    expect(placeholders.length).toBeGreaterThan(0)
    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('detects designed phase when docs have real content', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test' })
    const docsDir = join(dir, 'docs')
    writeFileSync(join(docsDir, '00-project-brief.md'), '# Project Brief\n\n## Objetivo\nSistema de gestion de inventarios para empresa industrial.\n\n## Alcance\nModulo de entrada, salida y reportes.\n\n## Usuarios\nOperadores de almacen y supervisores.', 'utf-8')
    writeFileSync(join(docsDir, '01-requirements.md'), '# Requirements\n\n## Funcionales\n- Registrar entradas de productos con codigo de barras\n- Generar reportes de inventario mensual\n- Alertas de stock minimo\n\n## No Funcionales\n- Respuesta menor a 2 segundos\n- Disponibilidad 99.5%', 'utf-8')
    writeFileSync(join(docsDir, '02-architecture.md'), '# Architecture\n\n## Stack\n- Node.js + Express + PostgreSQL\n\n## Modulos\n- API REST para CRUD de productos\n- Worker para reportes asincrono\n- Frontend React para operadores', 'utf-8')
    writeFileSync(join(docsDir, '06-security-rules.md'), '# Security Rules\n\n- Autenticacion JWT obligatoria en todos los endpoints\n- No exponer datos sensibles en logs', 'utf-8')
    writeFileSync(join(docsDir, '07-agent-rules.md'), '# Agent Rules\n\n- Presentar plan si se tocan mas de 3 archivos\n- No modificar migraciones sin aprobacion', 'utf-8')

    const result = runPreflightChecks(dir)
    expect(result.phase).toBe('designed')
    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('blocks session start when docs are placeholders', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test' })
    const db = getDb(resolve(dir, DB_PATH))
    const result = runSessionPreflightChecks(dir, db, true)
    expect(result.passed).toBe(false)
    expect(result.blockers.some(b => b.includes('Design documents'))).toBe(true)
    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })

  it('warns about open sessions', () => {
    const dir = tempProject()
    initializeControlledProject(dir, { project: 'test' })
    const db = getDb(resolve(dir, DB_PATH))
    const session = createSession('ds-20260615-001', 'test', 'claude-code', 'watch')
    session.status = 'active'
    insertSession(db, session)
    const result = runPreflightChecks(dir, db)
    const openCheck = result.checks.find(c => c.id === 'no-open-sessions')
    expect(openCheck?.passed).toBe(false)
    closeDb()
    rmSync(dir, { recursive: true, force: true })
  })
})
