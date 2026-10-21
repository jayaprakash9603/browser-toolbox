import { relativeSelector, segmentSelector } from './selector'
import type { ScrapeColumn, ScrapeRow } from './types'

function leafText(el: Element): string {
  const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  return t
}

function pickImageSrc(img: HTMLImageElement): string {
  return img.currentSrc || img.src || img.getAttribute('data-src') || ''
}

function autoLabel(key: string, el: Element | null): string {
  if (el) {
    const aria = el.getAttribute('aria-label')
    if (aria) return aria.slice(0, 48)
    const cls = [...el.classList].find((c) => c.length > 2 && !c.startsWith('css-'))
    if (cls) return cls.replace(/[-_]/g, ' ')
  }
  const last = key.split(' > ').pop() ?? key
  const tag = last.split(/[.#[]/)[0]
  return tag || 'field'
}

interface FieldHit {
  key: string
  relativeSelector: string
  attr: ScrapeColumn['attr']
  sample: string
  element: Element | null
}

function collectFieldsInRow(row: Element): FieldHit[] {
  const hits: FieldHit[] = []
  const seen = new Set<string>()

  const walk = (node: Element) => {
    if (node !== row) {
      const tag = node.tagName
      if (tag === 'A' && node.hasAttribute('href')) {
        const rel = relativeSelector(row, node)
        const key = rel ? `${rel}@href` : '@href'
        if (!seen.has(key)) {
          seen.add(key)
          hits.push({
            key,
            relativeSelector: rel || 'a',
            attr: 'href',
            sample: (node as HTMLAnchorElement).href,
            element: node,
          })
        }
      }
      if (tag === 'IMG') {
        const rel = relativeSelector(row, node)
        const key = rel ? `${rel}@src` : '@src'
        const src = pickImageSrc(node as HTMLImageElement)
        if (src && !seen.has(key)) {
          seen.add(key)
          hits.push({
            key,
            relativeSelector: rel || 'img',
            attr: 'src',
            sample: src,
            element: node,
          })
        }
      }
      const text = leafText(node)
      const isLeaf =
        node.children.length === 0 ||
        (text.length > 0 && [...node.children].every((c) => !leafText(c)))
      if (isLeaf && text.length > 0 && text.length < 2000) {
        const rel = relativeSelector(row, node)
        const key = rel || segmentSelector(node)
        if (!seen.has(key)) {
          seen.add(key)
          hits.push({
            key,
            relativeSelector: rel || '*',
            attr: 'text',
            sample: text.slice(0, 200),
            element: node,
          })
        }
      }
    }
    for (const child of node.children) walk(child)
  }
  walk(row)
  return hits
}

export function inferColumnsFromRows(rowElements: Element[], _rowSelector?: string): ScrapeColumn[] {
  const keyStats = new Map<string, { count: number; hit: FieldHit }>()
  for (const row of rowElements) {
    for (const hit of collectFieldsInRow(row)) {
      const prev = keyStats.get(hit.key)
      if (!prev) keyStats.set(hit.key, { count: 1, hit })
      else prev.count += 1
    }
  }
  const minFill = Math.max(1, Math.floor(rowElements.length * 0.1))
  const columns: ScrapeColumn[] = []
  let order = 0
  for (const [key, { count, hit }] of keyStats) {
    if (count < minFill) continue
    columns.push({
      key,
      label: autoLabel(key, hit.element),
      relativeSelector: hit.relativeSelector,
      attr: hit.attr,
      order: order++,
    })
  }
  return columns.slice(0, 24)
}

export function extractRow(row: Element, columns: ScrapeColumn[], baseUrl?: string): ScrapeRow {
  const out: ScrapeRow = {}
  const base = baseUrl ?? (typeof location !== 'undefined' ? location.href : '')
  for (const col of columns) {
    if (col.hidden) continue
    let el: Element | null = row
    if (col.relativeSelector && col.relativeSelector !== '*') {
      try {
        el = row.querySelector(col.relativeSelector)
      } catch {
        el = null
      }
    }
    if (!el) {
      out[col.key] = ''
      continue
    }
    if (col.attr === 'href' && el instanceof HTMLAnchorElement) {
      out[col.key] = el.href
    } else if (col.attr === 'src' && el instanceof HTMLImageElement) {
      out[col.key] = pickImageSrc(el)
    } else if (col.attr === 'href') {
      const a = el.closest('a[href]') as HTMLAnchorElement | null
      out[col.key] = a?.href ?? ''
    } else {
      out[col.key] = leafText(el)
    }
    if (col.attr === 'href' && out[col.key].startsWith('/') && base) {
      try {
        out[col.key] = new URL(out[col.key], base).href
      } catch {
        /* */
      }
    }
  }
  return out
}

export function extractAllRows(
  rowSelector: string,
  columns: ScrapeColumn[],
  root: ParentNode = document,
): ScrapeRow[] {
  const rows: ScrapeRow[] = []
  let nodes: Element[] = []
  try {
    nodes = [...root.querySelectorAll(rowSelector)]
  } catch {
    return rows
  }
  const base = typeof location !== 'undefined' ? location.href : undefined
  for (const row of nodes) {
    rows.push(extractRow(row, columns, base))
  }
  return rows
}
