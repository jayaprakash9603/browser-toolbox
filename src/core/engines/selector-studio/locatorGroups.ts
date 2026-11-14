import type { SelectorCandidate } from './types'

export type LocatorGroup =
  | 'recommended'
  | 'css'
  | 'xpath'
  | 'text'
  | 'parent'
  | 'sibling'
  | 'axes'
  | 'indexed'
  | 'absolute'
  | 'jquery'
  | 'all'

const AXIS_STRATEGIES = new Set<SelectorCandidate['strategy']>([
  'relative',
  'ancestor',
  'parent-child',
  'sibling',
  'structural',
])

export function filterLocatorGroup(candidates: SelectorCandidate[], group: LocatorGroup): SelectorCandidate[] {
  if (group === 'all') return candidates
  if (group === 'css') return candidates.filter((item) => item.kind === 'css')
  if (group === 'xpath') return candidates.filter((item) => item.kind === 'xpath')
  if (group === 'text') return candidates.filter((item) => item.strategy === 'text' || item.strategy === 'predicate')
  if (group === 'parent') return candidates.filter((item) => item.strategy === 'parent-child' || item.strategy === 'ancestor')
  if (group === 'sibling') return candidates.filter((item) => item.strategy === 'sibling')
  if (group === 'axes') return candidates.filter((item) => AXIS_STRATEGIES.has(item.strategy))
  if (group === 'indexed') return candidates.filter((item) => item.strategy === 'nth' || /\)\[\d+\]/.test(item.expression))
  if (group === 'absolute') {
    return candidates.filter((item) => item.expression.startsWith('/html'))
  }
  if (group === 'jquery') {
    return candidates.filter(
      (item) =>
        item.reasons.includes('jQuery') ||
        item.reasons.includes('querySelector') ||
        item.reasons.includes('Playwright'),
    )
  }
  if (group === 'recommended') {
    return candidates.filter(
      (item) =>
        item.syntaxValid !== false &&
        item.uniqueness === 'unique' &&
        item.intendedMatched !== false &&
        item.matchCount === 1,
    )
  }
  return candidates
}