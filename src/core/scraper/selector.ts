import { cssEscape } from '@/core/engines/selector'

const HASH_CLASS = /^(css-|sc-|_[a-z0-9]{5,}|[a-f0-9]{8,})$/i

export function isStableClass(name: string): boolean {
  if (!name || name.length < 2) return false
  if (HASH_CLASS.test(name)) return false
  if (/^[a-z]+-[a-z0-9]{6,}$/i.test(name) && name.includes('-')) return false
  return true
}

export function stableClasses(el: Element): string[] {
  return [...el.classList].filter(isStableClass).slice(0, 3)
}

export function segmentSelector(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (el.id) return `${tag}#${cssEscape(el.id)}`
  for (const attr of ['data-testid', 'data-test', 'data-id', 'data-qa']) {
    const v = el.getAttribute(attr)
    if (v) return `${tag}[${attr}="${cssEscape(v)}"]`
  }
  const classes = stableClasses(el)
  if (classes.length) return `${tag}.${classes.map(cssEscape).join('.')}`
  const parent = el.parentElement
  if (!parent) return tag
  const siblings = [...parent.children].filter((c) => c.tagName === el.tagName)
  const idx = siblings.indexOf(el) + 1
  return `${tag}:nth-of-type(${idx})`
}

export function cssPathFromRoot(el: Element, root?: Element | Document): string {
  const stop = root instanceof Document ? root.documentElement : root
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur !== stop && cur !== document.documentElement) {
    parts.unshift(segmentSelector(cur))
    cur = cur.parentElement
  }
  return parts.join(' > ')
}

export function isUniqueSelector(selector: string, root: ParentNode = document): boolean {
  try {
    return root.querySelectorAll(selector).length === 1
  } catch {
    return false
  }
}

export function generalizeRowSelector(el: Element): { rowSelector: string; count: number } {
  const parent = el.parentElement
  if (!parent) {
    const self = cssPathFromRoot(el)
    return { rowSelector: self, count: 1 }
  }
  const tag = el.tagName
  const siblings = [...parent.children].filter((c) => c.tagName === tag)
  if (siblings.length >= 2) {
    const seg = segmentSelector(el)
    const parentPath = cssPathFromRoot(parent)
    const rowSelector = parentPath ? `${parentPath} > ${seg.split(':nth-of-type')[0] || seg}` : seg
    try {
      const count = document.querySelectorAll(rowSelector).length
      if (count >= 2) return { rowSelector, count }
    } catch {
      /* fall through */
    }
    const simple = `${parentPath} > ${tag.toLowerCase()}`
    try {
      const count = document.querySelectorAll(simple).length
      if (count >= 2) return { rowSelector: simple, count }
    } catch {
      /* */
    }
  }
  const classes = stableClasses(el)
  if (classes.length && parent) {
    const rowSelector = `${cssPathFromRoot(parent)} > ${tag.toLowerCase()}.${classes.map(cssEscape).join('.')}`
    try {
      const count = document.querySelectorAll(rowSelector).length
      if (count >= 2) return { rowSelector, count }
    } catch {
      /* */
    }
  }
  return { rowSelector: cssPathFromRoot(el), count: 1 }
}

export function relativeSelector(row: Element, target: Element): string {
  if (row === target) return ''
  const parts: string[] = []
  let cur: Element | null = target
  while (cur && cur !== row) {
    parts.unshift(segmentSelector(cur))
    cur = cur.parentElement
  }
  return parts.join(' > ')
}
