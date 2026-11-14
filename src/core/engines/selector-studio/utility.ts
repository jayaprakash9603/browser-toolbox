import type { SelectorCandidate, SelectorSnapshot } from './types'
import { TEST_ATTRIBUTES } from './types'

export function resolveLocatorQuery(
  candidate: SelectorCandidate,
): { kind: 'css' | 'xpath'; expression: string } {
  return candidate.evaluateAs ?? { kind: candidate.kind, expression: candidate.expression }
}

function testIdOf(snapshot: SelectorSnapshot): { name: string; value: string } | null {
  for (const name of TEST_ATTRIBUTES) {
    const value = snapshot.attributes[name]
    if (value) return { name, value }
  }
  return null
}

export function utilityCandidatesFrom(
  ranked: SelectorCandidate[],
  snapshot?: SelectorSnapshot,
): SelectorCandidate[] {
  const out: SelectorCandidate[] = []
  const seen = new Set(ranked.map((item) => item.id))

  const pushUtility = (candidate: SelectorCandidate) => {
    if (seen.has(candidate.id)) return
    seen.add(candidate.id)
    out.push(candidate)
  }

  const css = ranked.filter((item) => item.kind === 'css' && item.evaluateAs == null).slice(0, 8)
  for (const item of css) {
    pushUtility({
      ...item,
      id: `utility:jquery:${item.id}`,
      expression: `$(${JSON.stringify(item.expression)})`,
      evaluateAs: { kind: 'css', expression: item.expression },
      reasons: ['jQuery'],
      warnings: [],
      score: Math.max(0, item.score - 10),
    })
    pushUtility({
      ...item,
      id: `utility:query:${item.id}`,
      expression: `document.querySelector(${JSON.stringify(item.expression)})`,
      evaluateAs: { kind: 'css', expression: item.expression },
      reasons: ['querySelector'],
      warnings: [],
      score: Math.max(0, item.score - 12),
    })
    const pwCss = `page.locator(${JSON.stringify(item.expression)})`
    pushUtility({
      ...item,
      id: `utility:playwright:css:${item.id}`,
      expression: pwCss,
      evaluateAs: { kind: 'css', expression: item.expression },
      reasons: ['Playwright'],
      warnings: [],
      score: Math.max(0, item.score - 8),
    })
  }

  const xpath = ranked.filter((item) => item.kind === 'xpath' && item.evaluateAs == null).slice(0, 6)
  for (const item of xpath) {
    if (!item.expression.startsWith('(') && item.expression.length > 2) {
      pushUtility({
        ...item,
        id: `utility:index:xpath:${item.id}`,
        expression: `(${item.expression})[1]`,
        evaluateAs: { kind: 'xpath', expression: item.expression },
        reasons: ['index XPath'],
        warnings: [],
        score: Math.max(0, item.score - 6),
      })
    }
    const pwXpath = `page.locator(${JSON.stringify(`xpath=${item.expression}`)})`
    pushUtility({
      ...item,
      id: `utility:playwright:xpath:${item.id}`,
      expression: pwXpath,
      evaluateAs: { kind: 'xpath', expression: item.expression },
      reasons: ['Playwright'],
      warnings: [],
      score: Math.max(0, item.score - 9),
    })
  }

  if (snapshot) {
    const test = testIdOf(snapshot)
    const testCss = ranked.find((item) => item.strategy === 'test-attribute' && item.kind === 'css')
    if (test && testCss) {
      pushUtility({
        ...testCss,
        id: 'utility:playwright:getByTestId',
        expression: `page.getByTestId(${JSON.stringify(test.value)})`,
        evaluateAs: { kind: 'css', expression: testCss.expression },
        reasons: ['Playwright'],
        warnings: [],
        score: testCss.score + 5,
      })
    }
    const role = snapshot.attributes.role
    const name = snapshot.attributes['aria-label'] || snapshot.label?.text || ''
    const roleXPath = ranked.find((item) => item.strategy === 'semantic' || item.strategy === 'attribute')
    if (role && name && roleXPath) {
      pushUtility({
        ...roleXPath,
        id: 'utility:playwright:getByRole',
        kind: 'xpath',
        strategy: 'semantic',
        expression: `page.getByRole(${JSON.stringify(role)}, { name: ${JSON.stringify(name)} })`,
        evaluateAs: { kind: 'xpath', expression: roleXPath.expression },
        reasons: ['Playwright'],
        warnings: [],
        score: Math.max(0, roleXPath.score - 3),
      })
    }
  }

  return out
}