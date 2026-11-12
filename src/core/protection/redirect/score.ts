import type { RedirectRiskLevel, RedirectRiskWeights } from './types'

export function scoreToRisk(score: number): RedirectRiskLevel {
  if (score >= 90) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

export function applyRiskSignals(
  weights: RedirectRiskWeights,
  signals: Partial<Record<keyof RedirectRiskWeights, boolean>>,
): number {
  let score = 0
  for (const key of Object.keys(weights) as (keyof RedirectRiskWeights)[]) {
    if (signals[key]) score += weights[key]
  }
  return Math.min(100, score)
}
