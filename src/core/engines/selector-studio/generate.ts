import { generateCssCandidates } from './css'
import { applyScores, rankCandidates } from './score'
import type { RankMode, SelectorCandidate, SelectorSnapshot } from './types'
import { utilityCandidatesFrom } from './utility'
import { generateXPathCandidates } from './xpath'

const AXIS_STRATEGIES = new Set<SelectorCandidate['strategy']>([
  'relative',
  'ancestor',
  'parent-child',
  'sibling',
  'structural',
])

export function generateCandidates(
  snapshot: SelectorSnapshot,
  mode: RankMode = 'stable',
  options?: { includeAxes?: boolean },
): SelectorCandidate[] {
  let raw = [...generateCssCandidates(snapshot), ...generateXPathCandidates(snapshot)]
  if (options?.includeAxes === false) {
    raw = raw.filter((item) => !AXIS_STRATEGIES.has(item.strategy))
  }
  const ranked = rankCandidates(applyScores(raw, snapshot), mode)
  return [...ranked, ...utilityCandidatesFrom(ranked)]
}

export function bestCandidate(candidates: SelectorCandidate[]): SelectorCandidate | null {
  const usable = candidates.filter(
    (item) => item.syntaxValid !== false && item.uniqueness !== 'none' && item.context !== 'cannot-verify',
  )
  return usable[0] ?? candidates[0] ?? null
}

export function candidatesByKind(
  candidates: SelectorCandidate[],
  kind: 'css' | 'xpath',
): SelectorCandidate[] {
  return candidates.filter((item) => item.kind === kind)
}
