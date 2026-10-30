export interface InspectListener {
  type: string
  source: 'attribute' | 'listener'
  count: number
  capture?: boolean
}

export interface MatchedStyleRule {
  selector: string
  cssText: string
  href: string
}

export interface ElementInspect {
  inlineStyle: string
  classes: string[]
  computed: { name: string; value: string }[]
  rules: MatchedStyleRule[]
  listeners: InspectListener[]
  box: { width: number; height: number; x: number; y: number }
  listenerSource: 'devtools' | 'attributes'
}

const COMPUTED_PROPS = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'margin',
  'padding',
  'border',
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'z-index',
  'opacity',
  'overflow',
  'visibility',
  'cursor',
  'box-sizing',
  'flex',
  'grid',
]

/** Self-contained so it can run inside inspectedWindow.eval or executeScript. */
export function captureElementInspect(element: Element): ElementInspect {
  const view = element.ownerDocument.defaultView
  const style = view?.getComputedStyle(element)
  const computed: { name: string; value: string }[] = []
  if (style) {
    for (const name of COMPUTED_PROPS) {
      const value = style.getPropertyValue(name)
      if (value) computed.push({ name, value })
    }
  }

  const rules: MatchedStyleRule[] = []
  const sheets = element.ownerDocument.styleSheets
  for (let i = 0; i < sheets.length && rules.length < 30; i += 1) {
    const sheet = sheets[i]
    let cssRules: CSSRuleList
    try {
      cssRules = sheet.cssRules
    } catch {
      continue
    }
    for (let r = 0; r < cssRules.length && rules.length < 30; r += 1) {
      const rule = cssRules[r]
      if (!(rule instanceof CSSStyleRule) || !rule.selectorText) continue
      try {
        if (!element.matches(rule.selectorText)) continue
      } catch {
        continue
      }
      rules.push({
        selector: rule.selectorText,
        cssText: rule.style.cssText,
        href: sheet.href || 'inline',
      })
    }
  }

  const listeners: InspectListener[] = []
  for (const attr of element.attributes) {
    if (!attr.name.startsWith('on') || attr.name.length < 3) continue
    listeners.push({ type: attr.name.slice(2), source: 'attribute', count: 1 })
  }

  let listenerSource: ElementInspect['listenerSource'] = 'attributes'
  const api = (
    view as (Window & { getEventListeners?: (node: EventTarget) => Record<string, { useCapture?: boolean }[]> }) | null
  )?.getEventListeners
    ?? (globalThis as { getEventListeners?: (node: EventTarget) => Record<string, { useCapture?: boolean }[]> })
      .getEventListeners
  if (typeof api === 'function') {
    try {
      const map = api(element)
      listenerSource = 'devtools'
      for (const type of Object.keys(map ?? {})) {
        const list = map[type] ?? []
        listeners.push({
          type,
          source: 'listener',
          count: list.length,
          capture: list.some((item) => item.useCapture),
        })
      }
    } catch {
      /* command-line API unavailable */
    }
  }

  const rect = element.getBoundingClientRect()
  return {
    inlineStyle: (element as HTMLElement).style?.cssText ?? '',
    classes: [...element.classList],
    computed,
    rules,
    listeners,
    box: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
    listenerSource,
  }
}

export function captureInspectByIdentity(identityPath: string | null): ElementInspect | null {
  if (!identityPath || identityPath.includes('shadow()')) return null
  try {
    const result = document.evaluate(identityPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    return result.singleNodeValue instanceof Element
      ? captureElementInspect(result.singleNodeValue)
      : null
  } catch {
    return null
  }
}
