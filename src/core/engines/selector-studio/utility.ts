import type { SelectorCandidate } from './types'

export function resolveLocatorQuery(
  candidate: SelectorCandidate,
): { kind: 'css' | 'xpath'; expression: string } {
  return candidate.evaluateAs ?? { kind: candidate.kind, expression: candidate.expression }
}

export function utilityCandidatesFrom(ranked: SelectorCandidate[]): SelectorCandidate[] {
  const css = ranked.filter((item) => item.kind === 'css' && item.evaluateAs == null).slice(0, 8)
  const out: SelectorCandidate[] = []
  const seen = new Set(ranked.map((item) => item.id))

  for (const item of css) {
    const jq = `$(${JSON.stringify(item.expression)})`
    const id = `utility:jquery:${item.id}`
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      ...item,
      id,
      expression: jq,
      evaluateAs: { kind: 'css', expression: item.expression },
      reasons: ['jQuery'],
      warnings: [],
      score: Math.max(0, item.score - 10),
    })

    const qs = `document.querySelector(${JSON.stringify(item.expression)})`
    const qsId = `utility:query:${item.id}`
    if (!seen.has(qsId)) {
      seen.add(qsId)
      out.push({
        ...item,
        id: qsId,
        expression: qs,
        evaluateAs: { kind: 'css', expression: item.expression },
        reasons: ['querySelector'],
        warnings: [],
        score: Math.max(0, item.score - 12),
      })
    }
  }

  return out
}