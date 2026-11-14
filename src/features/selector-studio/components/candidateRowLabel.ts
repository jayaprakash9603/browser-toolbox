import type { SelectorCandidate } from '@/core/engines/selector-studio'

const REL = new Set<SelectorCandidate['strategy']>([
  'relative',
  'ancestor',
  'parent-child',
  'sibling',
  'structural',
])

export function candidateRowLabel(candidate: SelectorCandidate): string {
  const rel = REL.has(candidate.strategy)
  if (candidate.kind === 'css') {
    if (rel) return 'Rel cssSelector'
    if (candidate.strategy === 'test-attribute') return 'cssSelector'
    if (candidate.strategy === 'id') return 'cssSelector'
    return `CSS · ${candidate.strategy}`
  }
  if (rel) return 'Rel XPath'
  if (candidate.strategy === 'nth' || candidate.strategy === 'structural') return 'index XPath'
  if (candidate.strategy === 'id') return 'XPath'
  return `XPath · ${candidate.strategy}`
}

export function isRelativeCandidate(candidate: SelectorCandidate): boolean {
  return REL.has(candidate.strategy)
}