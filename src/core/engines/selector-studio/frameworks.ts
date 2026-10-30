import { xpathLiteral } from './escape'
import type { FrameworkId, FrameworkSnippet, SelectorCandidate, SelectorSnapshot } from './types'
import { TEST_ATTRIBUTES } from './types'

function jsString(value: string): string {
  return JSON.stringify(value)
}

function pyString(value: string): string {
  return JSON.stringify(value)
}

function testIdOf(snapshot: SelectorSnapshot): { name: string; value: string } | null {
  for (const name of TEST_ATTRIBUTES) {
    const value = snapshot.attributes[name]
    if (value) return { name, value }
  }
  return null
}

function preferred(candidates: SelectorCandidate[], kind: 'css' | 'xpath'): SelectorCandidate | undefined {
  return candidates.find((item) => item.kind === kind && item.uniqueness === 'unique')
    ?? candidates.find((item) => item.kind === kind)
}

export function frameworkSnippets(
  snapshot: SelectorSnapshot,
  candidates: SelectorCandidate[],
): FrameworkSnippet[] {
  const css = preferred(candidates, 'css')
  const xpath = preferred(candidates, 'xpath')
  const test = testIdOf(snapshot)
  const role = snapshot.attributes.role
  const name = snapshot.attributes['aria-label'] || snapshot.label?.text || ''
  const snippets: FrameworkSnippet[] = []

  if (xpath) {
    snippets.push({
      framework: 'selenium',
      label: 'Selenium · XPath',
      language: 'python',
      api: 'By.XPATH',
      locator: xpath.expression,
      code: `driver.find_element(By.XPATH, ${pyString(xpath.expression)})`,
    })
  }
  if (snapshot.id && snapshot.idUnique !== false) {
    snippets.push({
      framework: 'selenium',
      label: 'Selenium · ID',
      language: 'python',
      api: 'By.ID',
      locator: snapshot.id,
      code: `driver.find_element(By.ID, ${pyString(snapshot.id)})`,
    })
  }
  if (css) {
    snippets.push({
      framework: 'selenium',
      label: 'Selenium · CSS',
      language: 'python',
      api: 'By.CSS_SELECTOR',
      locator: css.expression,
      code: `driver.find_element(By.CSS_SELECTOR, ${pyString(css.expression)})`,
    })
  }

  if (test) {
    snippets.push({
      framework: 'playwright',
      label: 'Playwright · getByTestId',
      language: 'typescript',
      api: 'getByTestId',
      locator: test.value,
      code: `page.getByTestId(${jsString(test.value)})`,
    })
  }
  if (role && name) {
    snippets.push({
      framework: 'playwright',
      label: 'Playwright · getByRole',
      language: 'typescript',
      api: 'getByRole',
      locator: role,
      code: `page.getByRole(${jsString(role)}, { name: ${jsString(name)} })`,
    })
  }
  if (snapshot.label?.text) {
    snippets.push({
      framework: 'playwright',
      label: 'Playwright · getByLabel',
      language: 'typescript',
      api: 'getByLabel',
      locator: snapshot.label.text,
      code: `page.getByLabel(${jsString(snapshot.label.text)})`,
    })
  }
  if (css) {
    snippets.push({
      framework: 'playwright',
      label: 'Playwright · CSS locator',
      language: 'typescript',
      api: 'locator',
      locator: css.expression,
      code: `page.locator(${jsString(css.expression)})`,
    })
  }
  if (xpath) {
    snippets.push({
      framework: 'playwright',
      label: 'Playwright · XPath locator',
      language: 'typescript',
      api: 'locator',
      locator: xpath.expression,
      code: `page.locator(${jsString(`xpath=${xpath.expression}`)})`,
    })
  }

  if (css) {
    snippets.push({
      framework: 'puppeteer',
      label: 'Puppeteer · locator',
      language: 'javascript',
      api: 'page.locator',
      locator: css.expression,
      code: `page.locator(${jsString(css.expression)})`,
    })
  }

  if (test) {
    snippets.push({
      framework: 'cypress',
      label: 'Cypress · test id',
      language: 'javascript',
      api: 'cy.get',
      locator: `[${test.name}="${test.value}"]`,
      code: `cy.get(${jsString(`[${test.name}="${test.value}"]`)})`,
    })
  } else if (css) {
    snippets.push({
      framework: 'cypress',
      label: 'Cypress · CSS',
      language: 'javascript',
      api: 'cy.get',
      locator: css.expression,
      code: `cy.get(${jsString(css.expression)})`,
    })
  }
  if (snapshot.text && snapshot.text.length >= 2 && snapshot.text.length <= 48) {
    snippets.push({
      framework: 'cypress',
      label: 'Cypress · contains',
      language: 'javascript',
      api: 'cy.contains',
      locator: snapshot.text,
      code: `cy.contains(${jsString(snapshot.tag)}, ${jsString(snapshot.text)})`,
    })
  }

  if (css) {
    snippets.push({
      framework: 'webdriverio',
      label: 'WebdriverIO · CSS',
      language: 'javascript',
      api: '$',
      locator: css.expression,
      code: `await $(${jsString(css.expression)})`,
    })
  }
  if (xpath) {
    snippets.push({
      framework: 'webdriverio',
      label: 'WebdriverIO · XPath',
      language: 'javascript',
      api: '$',
      locator: xpath.expression,
      code: `await $(${jsString(xpath.expression)})`,
    })
  }

  return snippets
}

export const FRAMEWORK_LABELS: Record<FrameworkId, string> = {
  selenium: 'Selenium',
  playwright: 'Playwright',
  puppeteer: 'Puppeteer',
  cypress: 'Cypress',
  webdriverio: 'WebdriverIO',
}

/** Keep xpathLiteral reachable for tests that assert framework escaping. */
export function quotedXPath(value: string): string {
  return xpathLiteral(value)
}
