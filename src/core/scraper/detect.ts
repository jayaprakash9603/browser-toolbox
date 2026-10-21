import { inferColumnsFromRows } from './columns'
import type { DetectCandidate } from './types'
import { cssPathFromRoot, generalizeRowSelector, stableClasses } from './selector'

const SKIP_ANCESTORS = new Set(['NAV', 'HEADER', 'FOOTER', 'ASIDE', 'SCRIPT', 'STYLE', 'NOSCRIPT'])

function childSignature(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const cls = stableClasses(el).sort().join('.')
  return cls ? `${tag}.${cls}` : tag
}

function structureSimilarity(children: Element[]): number {
  if (children.length < 2) return 0
  const sigs = children.map((c) => {
    const inner = [...c.children].slice(0, 8).map(childSignature).join('|')
    return `${childSignature(c)}:${inner}`
  })
  const counts = new Map<string, number>()
  for (const s of sigs) counts.set(s, (counts.get(s) ?? 0) + 1)
  const dominant = Math.max(...counts.values())
  return dominant / children.length
}

function isPenaltyContainer(el: Element): boolean {
  const tag = el.tagName
  if (SKIP_ANCESTORS.has(tag)) return true
  const role = el.getAttribute('role')?.toLowerCase()
  if (role === 'navigation' || role === 'banner' || role === 'contentinfo') return true
  return false
}

function scoreContainer(container: Element, children: Element[]): number {
  if (children.length < 2) return 0
  const rect = container.getBoundingClientRect()
  if (rect.width < 40 || rect.height < 40) return 0
  const area = rect.width * rect.height
  const viewArea = Math.max(window.innerWidth * window.innerHeight, 1)
  const areaShare = Math.min(area / viewArea, 1)

  let textLen = 0
  let links = 0
  for (const c of children.slice(0, 20)) {
    textLen += (c.textContent ?? '').trim().length
    links += c.querySelectorAll('a[href]').length
  }
  const avgText = textLen / children.length
  const similarity = structureSimilarity(children)

  let score = children.length * 2 + similarity * 40 + areaShare * 30
  score += Math.min(avgText / 20, 15)
  score += Math.min(links, 10)

  const tag = container.tagName
  if (tag === 'TABLE' || tag === 'TBODY') score += 25
  const role = container.getAttribute('role')
  if (role === 'grid' || role === 'list' || role === 'rowgroup') score += 20

  if (isPenaltyContainer(container)) score *= 0.15
  let p: Element | null = container.parentElement
  for (let i = 0; i < 3 && p; i++) {
    if (isPenaltyContainer(p)) score *= 0.5
    p = p.parentElement
  }

  return score
}

function rowsFromTable(table: HTMLTableElement): Element[] {
  const body = table.tBodies[0] ?? table
  return [...body.querySelectorAll('tr')].filter((tr) => tr.querySelectorAll('td, th').length > 0)
}

export function detectCandidates(root: ParentNode = document): DetectCandidate[] {
  const candidates: DetectCandidate[] = []
  const seen = new Set<string>()

  const tables = root.querySelectorAll('table')
  tables.forEach((table) => {
    const rows = rowsFromTable(table)
    if (rows.length < 2) return
    const rowSelector = cssPathFromRoot(rows[0])
    const generalized = generalizeRowSelector(rows[0])
    const sel = generalized.count >= 2 ? generalized.rowSelector : rowSelector
    const containerSelector = cssPathFromRoot(table)
    const key = `${sel}|${containerSelector}`
    if (seen.has(key)) return
    seen.add(key)
    const sampleColumns = inferColumnsFromRows(rows.slice(0, 5), sel)
    candidates.push({
      rowSelector: sel,
      containerSelector,
      score: scoreContainer(table, rows) + 30,
      rowCount: document.querySelectorAll(sel).length,
      sampleColumns,
    })
  })

  const walk = root instanceof Document ? root.body : root
  if (!walk || !(walk instanceof Element)) return candidates.sort((a, b) => b.score - a.score)

  const stack: Element[] = [walk]
  while (stack.length) {
    const el = stack.pop()!
    if (el.children.length >= 2 && el.children.length <= 500) {
      const children = [...el.children].filter(
        (c) => !SKIP_ANCESTORS.has(c.tagName) && c.getBoundingClientRect().height > 4,
      )
      const bySig = new Map<string, Element[]>()
      for (const c of children) {
        const sig = childSignature(c)
        const list = bySig.get(sig) ?? []
        list.push(c)
        bySig.set(sig, list)
      }
      for (const group of bySig.values()) {
        if (group.length < 2) continue
        const score = scoreContainer(el, group)
        if (score < 8) continue
        const { rowSelector, count } = generalizeRowSelector(group[0])
        if (count < 2) continue
        const containerSelector = cssPathFromRoot(el)
        const key = `${rowSelector}|${containerSelector}`
        if (seen.has(key)) continue
        seen.add(key)
        const sampleColumns = inferColumnsFromRows(group.slice(0, 5), rowSelector)
        candidates.push({
          rowSelector,
          containerSelector,
          score,
          rowCount: count,
          sampleColumns,
        })
      }
    }
    for (const child of el.children) stack.push(child)
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 12)
}

export function detectAtIndex(index: number, root: ParentNode = document): DetectCandidate | null {
  const list = detectCandidates(root)
  return list[index] ?? null
}
