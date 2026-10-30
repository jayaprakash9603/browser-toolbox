import type { EvaluationResult, SelectorCandidate } from './types'
import { uniquenessOf } from './score'

export interface ValidationQuery {
  kind: 'css' | 'xpath'
  expression: string
}

export function applyEvaluation(
  candidate: SelectorCandidate,
  result: EvaluationResult,
): SelectorCandidate {
  const syntaxValid = result.syntaxValid
  const matchCount = syntaxValid ? result.matchCount : 0
  const intendedMatched = syntaxValid ? result.intendedMatched : false
  const uniqueness = uniquenessOf(syntaxValid ? matchCount : null, syntaxValid)
  const warnings = [...candidate.warnings]
  if (syntaxValid && matchCount === 0) warnings.push('Matches no elements.')
  if (syntaxValid && matchCount > 1) warnings.push(`Matches ${matchCount} elements.`)
  if (result.error) warnings.push(result.error)
  if (intendedMatched === false && matchCount > 0) {
    warnings.push('The intended element is not among the matches.')
  }
  return {
    ...candidate,
    syntaxValid,
    matchCount: syntaxValid ? matchCount : candidate.matchCount,
    intendedMatched,
    uniqueness,
    warnings: [...new Set(warnings)],
  }
}

export function statusLabel(candidate: SelectorCandidate): string {
  if (candidate.syntaxValid === false) return 'Invalid syntax'
  if (candidate.context === 'requires-shadow') return 'Requires a shadow-root context'
  if (candidate.context === 'requires-frame') return 'Requires a frame context'
  if (candidate.context === 'cannot-verify') return 'Cannot be verified in the current context'
  if (candidate.uniqueness === 'unique' && candidate.intendedMatched !== false) return 'Valid and unique'
  if (candidate.uniqueness === 'multiple') return 'Valid but matches multiple elements'
  if (candidate.uniqueness === 'none') return 'Valid but matches no elements'
  if (candidate.intendedMatched === false) return 'Intended element not matched'
  if (candidate.syntaxValid) return 'Valid'
  return 'Not yet tested'
}

export function interpretQuery(kind: 'css' | 'xpath', expression: string): ValidationQuery {
  return { kind, expression }
}
