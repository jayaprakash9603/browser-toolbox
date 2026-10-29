import { isGeneratedClass } from './stability'
import type { RankMode, SelectorCandidate, SelectorSnapshot } from './types'
import { STRATEGY_PRIORITY } from './types'

const POSITIONAL = /nth-(?:child|of-type)|\[\d+\]|position\(\)|last\(\)/i
const INDEXED_XPATH = /\/[a-z0-9*-]+\[\d+\]/i

export function uniquenessOf(matchCount: number | null, syntaxValid: boolean | null): SelectorCandidate['uniqueness'] {
  if (syntaxValid === false) return 'unknown'
  if (matchCount == null) return 'unknown'
  if (matchCount === 0) return 'none'
  if (matchCount === 1) return 'unique'
  return 'multiple'
}

export function scoreCandidate(candidate: SelectorCandidate, snapshot: SelectorSnapshot): number {
  let score = 48
  const unique = uniquenessOf(candidate.matchCount, candidate.syntaxValid)

  if (unique === 'unique') score += 26
  else if (unique === 'none') score -= 36
  else if (unique === 'multiple') score -= Math.min(22, 6 + (candidate.matchCount ?? 2))

  if (candidate.syntaxValid === false) score -= 40
  if (candidate.intendedMatched === false) score -= 20
  if (candidate.context === 'requires-shadow' || candidate.context === 'requires-frame') score -= 8
  if (candidate.context === 'cannot-verify') score -= 4

  switch (candidate.strategy) {
    case 'test-attribute':
      score += 20
      break
    case 'id':
      score += snapshot.idUnique && snapshot.id ? 16 : 6
      break
    case 'semantic':
      score += 12
      break
    case 'attribute':
    case 'compound':
      score += 8
      break
    case 'class':
      score += 4
      break
    case 'relative':
    case 'ancestor':
    case 'parent-child':
      score += 6
      break
    case 'text':
      score -= 4
      break
    case 'nth':
    case 'structural':
      score -= 16
      break
    case 'shadow':
    case 'frame':
      score -= 6
      break
    default:
      break
  }

  if (candidate.kind === 'css' && /:has\(/.test(candidate.expression)) score -= 3
  if (POSITIONAL.test(candidate.expression) || INDEXED_XPATH.test(candidate.expression)) score -= 10
  if (candidate.expression.length > 90) score -= 8
  else if (candidate.expression.length < 36) score += 3

  const classHits = snapshot.classes.filter((cls) => candidate.expression.includes(cls) && isGeneratedClass(cls))
  if (classHits.length) score -= 14

  score -= Math.min(12, candidate.warnings.length * 3)
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function compareCandidates(a: SelectorCandidate, b: SelectorCandidate, mode: RankMode): number {
  if (mode === 'shortest') {
    const length = a.expression.length - b.expression.length
    if (length) return length
  }
  if (mode === 'readable') {
    const read = readability(b) - readability(a)
    if (read) return read
  }
  if (mode === 'specific') {
    const spec = specificity(b) - specificity(a)
    if (spec) return spec
  }
  if (mode === 'automation') {
    const auto = automation(b) - automation(a)
    if (auto) return auto
  }
  if (b.score !== a.score) return b.score - a.score
  const strategy = STRATEGY_PRIORITY[a.strategy] - STRATEGY_PRIORITY[b.strategy]
  if (strategy) return strategy
  if (a.kind !== b.kind) return a.kind === 'css' ? -1 : 1
  return a.expression.localeCompare(b.expression)
}

function readability(candidate: SelectorCandidate): number {
  let value = candidate.score
  if (POSITIONAL.test(candidate.expression)) value -= 20
  if (candidate.strategy === 'structural' || candidate.strategy === 'nth') value -= 15
  if (candidate.strategy === 'test-attribute' || candidate.strategy === 'semantic') value += 10
  if (candidate.expression.length > 70) value -= 8
  return value
}

function specificity(candidate: SelectorCandidate): number {
  const attrs = (candidate.expression.match(/\[|@/g) ?? []).length
  const classes = (candidate.expression.match(/\./g) ?? []).length
  const combinators = (candidate.expression.match(/[>+~]|\/\//g) ?? []).length
  return attrs * 4 + classes * 2 + combinators + candidate.expression.length / 20
}

function automation(candidate: SelectorCandidate): number {
  let value = candidate.score
  if (candidate.strategy === 'test-attribute') value += 24
  if (candidate.strategy === 'semantic' || candidate.strategy === 'id') value += 10
  if (candidate.strategy === 'text') value -= 8
  if (candidate.strategy === 'structural' || candidate.strategy === 'nth') value -= 18
  return value
}

export function rankCandidates(
  candidates: SelectorCandidate[],
  mode: RankMode,
): SelectorCandidate[] {
  return [...candidates].sort((a, b) => compareCandidates(a, b, mode))
}

export function applyScores(candidates: SelectorCandidate[], snapshot: SelectorSnapshot): SelectorCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    uniqueness: uniquenessOf(candidate.matchCount, candidate.syntaxValid),
    score: scoreCandidate(candidate, snapshot),
  }))
}
