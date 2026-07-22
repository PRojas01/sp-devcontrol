/**
 * SP-DevControl v2.0.0
 * Bridge module: llmgraph context integration for change review
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { execa } from 'execa'
import type { ChangeSet } from './types.js'

export interface LlmgraphMetrics {
  sufficient: boolean
  topScore: number
  graphStale: boolean
  tokensSaved: number
  nodesScanned: number
  nodesIncluded: number
  warnings: string[]
}

export interface LlmgraphContextResult {
  available: boolean
  packText: string
  metrics: LlmgraphMetrics | null
  error: string | null
}

const ENV_KEY = 'DEVCONTROL_LLMGRAPH'

export function isLlmgraphEnabled(withContextFlag?: boolean): boolean {
  if (withContextFlag === false) return false
  if (process.env[ENV_KEY] === '0') return false
  if (withContextFlag === true) return true
  if (process.env[ENV_KEY] === '1') return true
  return true
}

function buildTaskDescription(change: ChangeSet): string {
  const files = change.files.map(f => f.filepath).join(', ')
  const risk = change.riskLevel
  return `review change ${change.id} (${risk} risk): files [${files}]`
}

export async function fetchLlmgraphContext(
  projectRoot: string,
  change: ChangeSet,
  maxTokens = 2000,
): Promise<LlmgraphContextResult> {
  const empty: LlmgraphContextResult = {
    available: false,
    packText: '',
    metrics: null,
    error: null,
  }

  try {
    const task = buildTaskDescription(change)
    const result = await execa('llmgraph', [
      'context', 'prepare', projectRoot, task,
      '--max-tokens', String(maxTokens), '--json',
    ], {
      timeout: 15000,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const stdout = result.stdout
    if (!stdout || stdout.trim().length === 0) {
      return empty
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(stdout)
    } catch {
      return { ...empty, packText: stdout }
    }

    const contextPack = (parsed.context_pack as string) ?? ''
    const metricsRaw = parsed.metrics as Record<string, unknown> | undefined

    const metrics: LlmgraphMetrics = {
      sufficient: (metricsRaw?.sufficient as boolean) ?? true,
      topScore: (metricsRaw?.top_score as number) ?? 0,
      graphStale: (metricsRaw?.graph_stale as boolean) ?? false,
      tokensSaved: (metricsRaw?.tokens_saved_percent as number) ?? 0,
      nodesScanned: (metricsRaw?.nodes_scanned as number) ?? 0,
      nodesIncluded: (metricsRaw?.nodes_included as number) ?? 0,
      warnings: (metricsRaw?.warnings as string[]) ?? [],
    }

    return {
      available: true,
      packText: contextPack,
      metrics,
      error: null,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ENOENT') || msg.includes('not found') || msg.includes('command not found')) {
      return empty
    }
    return { ...empty, error: msg }
  }
}

export function renderLlmgraphSection(result: LlmgraphContextResult): string {
  if (!result.available) return ''

  const lines: string[] = []
  lines.push('Contexto relevante (llmgraph)')

  if (result.metrics) {
    const m = result.metrics
    const stale = m.graphStale ? ' [GRAFO DESACTUALIZADO]' : ''
    const insufficient = !m.sufficient ? ' [CONTEXTO INSUFICIENTE — revisa los archivos directamente]' : ''
    lines.push(`  Suficiente: ${m.sufficient}${insufficient}`)
    lines.push(`  Grafo fresco: ${!m.graphStale}${stale}`)
    lines.push(`  Tokens ahorrados: ${m.tokensSaved.toFixed(1)}%`)
    lines.push(`  Nodos: ${m.nodesIncluded}/${m.nodesScanned} incluidos`)
    if (m.warnings.length > 0) {
      lines.push(`  Advertencias: ${m.warnings.join('; ')}`)
    }
  }

  if (result.packText) {
    const preview = result.packText.length > 1500
      ? result.packText.slice(0, 1500) + '\n... (recortado)'
      : result.packText
    lines.push('')
    lines.push(preview)
  }

  if (result.error) {
    lines.push(`  Error menor: ${result.error}`)
  }

  return lines.join('\n')
}
