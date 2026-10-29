import { generateCssCandidates } from './css'
import { applyScores, rankCandidates } from './score'
import type { RankMode, SelectorCandidate, SelectorSnapshot } from './types'
import { generateXPathCandidates } from './xpath'

export function generateCandidates(
  snapshot: SelectorSnapshot,
  mode: RankMode = 'stable',
): SelectorCandidate[] {
  const raw = [...generateCssCandidates(snapshot), ...generateXPathCandidates(snapshot)]
  return rankCandidates(applyScores(raw, snapshot), mode)
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
