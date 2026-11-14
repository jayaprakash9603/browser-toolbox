import type { SelectorCandidate } from './types'

export type MatchBadgeTone = 'unique' | 'multiple' | 'none' | 'wrong' | 'invalid' | 'untested' | 'blocked'

export interface MatchBadgeState {
  tone: MatchBadgeTone
  shortLabel: string
  count: number | null
}

export function matchBadgeState(candidate: SelectorCandidate): MatchBadgeState {
  if (candidate.syntaxValid === false) {
    return { tone: 'invalid', shortLabel: 'INVALID', count: null }
  }
  if (candidate.context === 'cannot-verify' || candidate.context === 'requires-shadow' || candidate.context === 'requires-frame') {
    return { tone: 'blocked', shortLabel: 'N/A', count: null }
  }
  if (candidate.matchCount == null || candidate.syntaxValid == null) {
    return { tone: 'untested', shortLabel: '—', count: null }
  }
  if (candidate.intendedMatched === false && candidate.matchCount > 0) {
    return { tone: 'wrong', shortLabel: 'WRONG', count: candidate.matchCount }
  }
  if (candidate.matchCount === 0) {
    return { tone: 'none', shortLabel: '0', count: 0 }
  }
  if (candidate.uniqueness === 'unique' && candidate.intendedMatched !== false) {
    return { tone: 'unique', shortLabel: String(candidate.matchCount), count: candidate.matchCount }
  }
  if (candidate.matchCount > 1) {
    return { tone: 'multiple', shortLabel: String(candidate.matchCount), count: candidate.matchCount }
  }
  return { tone: 'untested', shortLabel: String(candidate.matchCount), count: candidate.matchCount }
}