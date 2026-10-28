import { stripHash, type PageLinkMark } from '@/core/engines/linkChecker/report'

const STYLE_ID = 'toolbox-link-marks-style'
const MARK_ATTR = 'data-toolbox-link-mark'
const STATUS_ATTR = 'data-toolbox-link-status'

const CSS = `
[${MARK_ATTR}="problem"] {
  outline: 2px solid #dc2626 !important;
  outline-offset: 2px !important;
  background-color: rgba(220, 38, 38, 0.12) !important;
}
[${MARK_ATTR}="warning"] {
  outline: 2px dashed #d97706 !important;
  outline-offset: 2px !important;
  background-color: rgba(217, 119, 6, 0.1) !important;
}
`

function ensureStyle(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  ;(doc.head ?? doc.documentElement).appendChild(style)
}

export function clearPageLinkMarks(doc: Document = document): void {
  doc.querySelectorAll(`[${MARK_ATTR}]`).forEach((element) => {
    element.removeAttribute(MARK_ATTR)
    element.removeAttribute(STATUS_ATTR)
  })
  doc.getElementById(STYLE_ID)?.remove()
}

export function markPageLinks(marks: PageLinkMark[], doc: Document = document): { marked: number } {
  clearPageLinkMarks(doc)
  if (marks.length === 0) return { marked: 0 }
  ensureStyle(doc)
  const byUrl = new Map(marks.map((mark) => [mark.url, mark]))
  let marked = 0
  for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('a[href], area[href]')) {
    const mark = byUrl.get(stripHash(anchor.href))
    if (!mark) continue
    anchor.setAttribute(MARK_ATTR, mark.tone)
    anchor.setAttribute(STATUS_ATTR, mark.label)
    marked += 1
  }
  return { marked }
}
