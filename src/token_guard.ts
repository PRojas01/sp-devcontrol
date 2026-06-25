import type { TokenBudgetStatus, Session, SessionChecklistItem, SessionRequest } from './types.js'

export function estimateTokensFromText(content: string): number {
  return Math.ceil(content.trim().length / 4)
}

export function estimateSessionTokens(
  session: Session,
  requests: SessionRequest[],
  checklist: SessionChecklistItem[],
  memoryBlobs: string[],
): number {
  let total = 0
  total += estimateTokensFromText(session.objective ?? '')
  total += estimateTokensFromText((session.allowedScope ?? []).join('\n'))
  total += requests.reduce((sum, req) => sum + estimateTokensFromText(req.requestText), 0)
  total += checklist.reduce((sum, item) => sum + estimateTokensFromText(`${item.itemText}\n${item.acceptanceCriteria}\n${item.notes ?? ''}`), 0)
  total += memoryBlobs.reduce((sum, blob) => sum + estimateTokensFromText(blob), 0)
  return total
}

export function evaluateTokenBudget(session: Session, estimate: number, threshold: number): TokenBudgetStatus {
  const budget = session.tokenBudget ?? 0
  const remaining = Math.max(budget - estimate, 0)
  const percentUsed = budget > 0 ? estimate / budget : 0
  return {
    sessionId: session.id,
    budget,
    estimate,
    remaining,
    percentUsed,
    nearLimit: budget > 0 && percentUsed >= threshold,
  }
}
