import { checkContrast, parseColor, type ContrastResult } from '@/core/engines/color'

import type { CapturedElement, SelectorSet } from './index'

export interface BoxSides {
  top: number
  right: number
  bottom: number
  left: number
}

export interface BoxModel {
  margin: BoxSides
  padding: BoxSides
  border: BoxSides
  content: { width: number; height: number }
}

function parseLength(token: string): number {
  const value = Number.parseFloat(token)
  return Number.isFinite(value) ? value : 0
}

/** Turns `10px 4px` / `1px solid rgb(...)` into four sides in CSS pixels. */
export function parseBoxSides(value: string | undefined): BoxSides {
  const empty = { top: 0, right: 0, bottom: 0, left: 0 }
  if (!value || value === 'none' || value === 'auto') return empty
  const tokens = value.trim().split(/\s+/)
  const borderStyle = /^(solid|dashed|dotted|double|groove|ridge|inset|outset|none|hidden)$/i
  if (tokens.length >= 2 && borderStyle.test(tokens[1])) {
    const width = parseLength(tokens[0])
    return { top: width, right: width, bottom: width, left: width }
  }
  const nums = tokens.map(parseLength)
  if (nums.length === 1) return { top: nums[0], right: nums[0], bottom: nums[0], left: nums[0] }
  if (nums.length === 2) return { top: nums[0], right: nums[1], bottom: nums[0], left: nums[1] }
  if (nums.length === 3) return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[1] }
  return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[3] }
}

export function boxModelOf(element: CapturedElement): BoxModel {
  const styles = element.computedStyles
  return {
    margin: parseBoxSides(styles.margin),
    padding: parseBoxSides(styles.padding),
    border: parseBoxSides(styles.border),
    content: { width: element.dimensions.width, height: element.dimensions.height },
  }
}

function isTransparent(value: string): boolean {
  const text = value.trim().toLowerCase()
  if (!text || text === 'transparent') return true
  if (/,\s*0(?:\.0+)?\s*\)$/.test(text)) return true
  if (/\/\s*0(?:\.0+)?%?\s*\)$/.test(text)) return true
  return false
}

export function contrastOf(element: CapturedElement): ContrastResult | null {
  const color = element.computedStyles.color ?? ''
  const background = element.computedStyles['background-color'] ?? ''
  if (isTransparent(background)) return null
  const fg = parseColor(color)
  const bg = parseColor(background)
  if (!fg.ok || !bg.ok) return null
  return checkContrast(fg.value, bg.value)
}

export interface A11ySnapshot {
  role: string
  name: string
  hidden: boolean
  focusable: boolean
  interactive: boolean
  labelled: boolean
}

const INTERACTIVE = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary', 'option'])

export function a11yOf(element: CapturedElement): A11ySnapshot {
  const attrs = element.attributes
  const role = attrs.role || implicitRole(element.tag)
  const name = (
    attrs['aria-label'] ||
    attrs['aria-labelledby'] ||
    attrs.alt ||
    attrs.title ||
    attrs.placeholder ||
    element.text
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  const hidden =
    attrs['aria-hidden'] === 'true' ||
    attrs.hidden !== undefined ||
    element.computedStyles.visibility === 'hidden' ||
    element.computedStyles.display === 'none'
  const tabindex = attrs.tabindex
  const focusable =
    INTERACTIVE.has(element.tag) || (tabindex != null && tabindex !== '-1')
  return {
    role,
    name,
    hidden,
    focusable,
    interactive: INTERACTIVE.has(element.tag) || Boolean(attrs.onclick) || role === 'button' || role === 'link',
    labelled: name.length > 0,
  }
}

function implicitRole(tag: string): string {
  if (tag === 'a') return 'link'
  if (tag === 'button') return 'button'
  if (tag === 'img') return 'img'
  if (tag === 'input') return 'textbox'
  if (tag === 'nav') return 'navigation'
  if (tag === 'main') return 'main'
  if (tag === 'header') return 'banner'
  if (tag === 'footer') return 'contentinfo'
  return tag
}

export function selectorRows(selectors: SelectorSet): { key: keyof SelectorSet; group: 'css' | 'xpath'; value: string }[] {
  const order: { key: keyof SelectorSet; group: 'css' | 'xpath' }[] = [
    { key: 'cssId', group: 'css' },
    { key: 'cssClass', group: 'css' },
    { key: 'cssAttribute', group: 'css' },
    { key: 'cssRelative', group: 'css' },
    { key: 'cssAbsolute', group: 'css' },
    { key: 'xpathId', group: 'xpath' },
    { key: 'xpathClass', group: 'xpath' },
    { key: 'xpathAttribute', group: 'xpath' },
    { key: 'xpathText', group: 'xpath' },
    { key: 'xpathRelative', group: 'xpath' },
    { key: 'xpathAbsolute', group: 'xpath' },
  ]
  return order.flatMap((row) => {
    const value = selectors[row.key]
    return value ? [{ ...row, value }] : []
  })
}

export function countCssMatches(selector: string): number {
  try {
    return document.querySelectorAll(selector).length
  } catch {
    return 0
  }
}

export function hitsFor(selectors: SelectorSet): Record<string, number> {
  const hits: Record<string, number> = {}
  for (const key of Object.keys(selectors) as (keyof SelectorSet)[]) {
    if (!key.startsWith('css')) continue
    const value = selectors[key]
    if (value) hits[key] = countCssMatches(value)
  }
  return hits
}

export interface InspectIssue {
  id: string
  severity: 'error' | 'warn' | 'info'
  label: string
}

export function issuesOf(element: CapturedElement, contrast: ContrastResult | null): InspectIssue[] {
  const a11y = a11yOf(element)
  const issues: InspectIssue[] = []
  if (a11y.interactive && !a11y.labelled) {
    issues.push({ id: 'name', severity: 'error', label: 'Interactive control has no accessible name' })
  }
  if (element.tag === 'img' && !element.attributes.alt && element.attributes['aria-hidden'] !== 'true') {
    issues.push({ id: 'alt', severity: 'error', label: 'Image is missing alt text' })
  }
  if (a11y.hidden) {
    issues.push({ id: 'hidden', severity: 'warn', label: 'Hidden from assistive technology' })
  }
  if (contrast && !contrast.aaNormal) {
    issues.push({
      id: 'contrast',
      severity: 'error',
      label: `Contrast ${contrast.ratio}:1 fails WCAG AA (4.5:1)`,
    })
  } else if (contrast && !contrast.aaaNormal) {
    issues.push({
      id: 'contrast-aaa',
      severity: 'info',
      label: `Contrast ${contrast.ratio}:1 meets AA, not AAA`,
    })
  }
  const fontSize = Number.parseFloat(element.computedStyles['font-size'] ?? '')
  if (Number.isFinite(fontSize) && fontSize > 0 && fontSize < 12) {
    issues.push({ id: 'tiny', severity: 'warn', label: `Font size ${fontSize}px is below 12px` })
  }
  const tabindex = element.attributes.tabindex
  if (tabindex != null && Number(tabindex) > 0) {
    issues.push({ id: 'tabindex', severity: 'warn', label: 'Positive tabindex disrupts natural focus order' })
  }
  return issues
}

export interface TestLocators {
  playwright: string
  cypress: string
  testingLibrary: string
  xpath: string
}

export function locatorsOf(element: CapturedElement, selectors: SelectorSet): TestLocators {
  const css = selectors.cssId || selectors.cssAttribute || selectors.cssRelative
  const xpath = selectors.xpathId || selectors.xpathRelative
  const a11y = a11yOf(element)
  const roleName =
    a11y.labelled && a11y.role
      ? `screen.getByRole(${JSON.stringify(a11y.role)}, { name: ${JSON.stringify(a11y.name)} })`
      : ''
  return {
    playwright: css ? `page.locator(${JSON.stringify(css)})` : '',
    cypress: css ? `cy.get(${JSON.stringify(css)})` : '',
    testingLibrary: roleName,
    xpath: xpath ? `xpath=${xpath}` : '',
  }
}

export function occupancyPct(element: CapturedElement): number | null {
  const viewport = element.viewport
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) return null
  const area = Math.max(0, element.dimensions.width) * Math.max(0, element.dimensions.height)
  return Math.min(100, (area / (viewport.width * viewport.height)) * 100)
}

export function elementLabel(element: CapturedElement): string {
  const id = element.id ? `#${element.id}` : ''
  const cls = element.classes[0] ? `.${element.classes[0]}` : ''
  return `${element.tag}${id}${cls}`
}

export function reportMarkdown(
  element: CapturedElement,
  selectors: SelectorSet,
  contrast: ContrastResult | null,
): string {
  const dim = element.dimensions
  const lines = [
    `## <${element.tag}>${element.id ? `#${element.id}` : ''}`,
    '',
    `- Size: ${Math.round(dim.width)} × ${Math.round(dim.height)}`,
    `- Position: ${Math.round(dim.x)}, ${Math.round(dim.y)}`,
    `- Display: ${element.computedStyles.display ?? '—'} · ${element.computedStyles.position ?? '—'}`,
  ]
  if (contrast) lines.push(`- Contrast: ${contrast.ratio}:1 (${contrast.aaNormal ? 'AA' : 'fail AA'})`)
  const css = selectors.cssRelative || selectors.cssId
  if (css) lines.push(`- CSS: \`${css}\``)
  const text = element.text.replace(/\s+/g, ' ').trim()
  if (text) lines.push('', '### Text', '', text.slice(0, 400))
  return lines.join('\n')
}
