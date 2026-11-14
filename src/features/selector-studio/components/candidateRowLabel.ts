import type { SelectorCandidate } from '@/core/engines/selector-studio'

const REL = new Set<SelectorCandidate['strategy']>([
  'relative',
  'ancestor',
  'parent-child',
  'sibling',
  'structural',
])

const STRATEGY_LABEL: Partial<Record<SelectorCandidate['strategy'], string>> = {
  'test-attribute': 'Test attr',
  id: 'ID',
  semantic: 'Semantic',
  attribute: 'Attribute',
  class: 'Class',
  compound: 'Compound',
  text: 'Text XPath',
  relative: 'Rel XPath',
  ancestor: 'Ancestor',
  'parent-child': 'Parent / Child',
  sibling: 'Sibling',
  structural: 'Structural',
  predicate: 'Predicate',
  nth: 'Indexed',
  scope: 'Scope',
  has: 'Has',
  shadow: 'Shadow',
  frame: 'Frame',
}

export function candidateRowLabel(candidate: SelectorCandidate): string {
  const custom = STRATEGY_LABEL[candidate.strategy]
  if (custom) {
    if (candidate.kind === 'css' && candidate.strategy === 'relative') return 'Rel CSS'
    if (candidate.kind === 'css' && (candidate.strategy === 'id' || candidate.strategy === 'test-attribute')) {
      return 'Rel cssSelector'
    }
    return custom
  }
  const rel = REL.has(candidate.strategy)
  if (candidate.kind === 'css') {
    if (rel) return 'Rel CSS'
    return 'CSS'
  }
  if (rel) return 'Rel XPath'
  if (candidate.expression.startsWith('/html')) return 'Absolute XPath'
  return 'XPath'
}

export function isRelativeCandidate(candidate: SelectorCandidate): boolean {
  return REL.has(candidate.strategy)
}