import type { DocBlock, InlineRun } from './document'

export interface HtmlDocument {
  title: string
  blocks: DocBlock[]
  images: number
}

const SKIP = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'svg', 'canvas', 'button', 'select', 'input', 'textarea', 'object', 'embed', 'video', 'audio', 'dialog'])
const CHROME = new Set(['nav', 'header', 'footer', 'aside', 'form'])
const BLOCKS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'table', 'hr', 'div', 'section', 'article', 'main', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'address', 'details', 'summary', 'body', 'center'])

function absolute(href: string | null, base?: string): string | undefined {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return undefined
  try {
    return new URL(href, base).href
  } catch {
    return undefined
  }
}

function inlineRuns(node: Node, base: string | undefined, style: Omit<InlineRun, 'text'> = {}): InlineRun[] {
  const runs: InlineRun[] = []
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ')
      if (text) runs.push({ text, ...style })
      continue
    }
    if (!(child instanceof Element)) continue
    const tag = child.localName
    if (SKIP.has(tag)) continue
    if (tag === 'br') {
      runs.push({ text: '\n', ...style })
      continue
    }
    if (tag === 'img') {
      const alt = child.getAttribute('alt')?.trim()
      if (alt) runs.push({ text: `[${alt}]`, ...style, italic: true })
      continue
    }
    const next = { ...style }
    if (tag === 'strong' || tag === 'b') next.bold = true
    if (tag === 'em' || tag === 'i' || tag === 'cite') next.italic = true
    if (tag === 'code' || tag === 'kbd' || tag === 'samp') next.code = true
    if (tag === 'del' || tag === 's' || tag === 'strike') next.strike = true
    if (tag === 'a') next.href = absolute(child.getAttribute('href'), base) ?? style.href
    runs.push(...inlineRuns(child, base, next))
  }
  return runs
}

function tidy(runs: InlineRun[]): InlineRun[] {
  const merged: InlineRun[] = []
  for (const run of runs) {
    const last = merged[merged.length - 1]
    if (last && last.bold === run.bold && last.italic === run.italic && last.code === run.code && last.strike === run.strike && last.href === run.href) last.text += run.text
    else merged.push({ ...run })
  }
  if (merged.length) {
    merged[0].text = merged[0].text.replace(/^\s+/, '')
    merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, '')
  }
  return merged.filter((run) => run.text)
}

/** Reads readable content from an HTML page: headings, paragraphs, lists, quotes, code and tables. */
export function htmlToBlocks(html: string, base?: string, options: { keepChrome?: boolean } = {}): HtmlDocument {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || doc.title.trim()
  const root = doc.querySelector('article') ?? doc.querySelector('main') ?? doc.querySelector('[role="main"]') ?? doc.body
  const blocks: DocBlock[] = []
  let listId = 0
  let images = 0
  if (!root) return { title, blocks, images }
  images = root.querySelectorAll('img').length

  const paragraph = (runs: InlineRun[]) => {
    const clean = tidy(runs)
    if (clean.some((run) => run.text.trim())) blocks.push({ type: 'paragraph', runs: clean })
  }

  const list = (node: Element, depth: number) => {
    listId += 1
    const id = listId
    const ordered = node.localName === 'ol'
    let index = Number(node.getAttribute('start') ?? 1) - 1
    for (const item of node.children) {
      if (item.localName !== 'li') continue
      index += 1
      const own: InlineRun[] = []
      const nested: Element[] = []
      for (const child of item.childNodes) {
        if (child instanceof Element && (child.localName === 'ul' || child.localName === 'ol')) nested.push(child)
        else if (child instanceof Element && BLOCKS.has(child.localName)) own.push(...inlineRuns(child, base), { text: ' ' })
        else {
          const wrapper = doc.createElement('span')
          wrapper.append(child.cloneNode(true))
          own.push(...inlineRuns(wrapper, base))
        }
      }
      const checkbox = item.querySelector(':scope > input[type="checkbox"]')
      const runs = tidy(own)
      if (runs.length) blocks.push({ type: 'list', ordered, index, depth: Math.min(depth, 4), listId: id, checked: checkbox ? (checkbox as HTMLInputElement).checked : undefined, runs })
      for (const child of nested) list(child, depth + 1)
    }
  }

  const visit = (node: Element) => {
    let pending: InlineRun[] = []
    const flush = () => {
      paragraph(pending)
      pending = []
    }
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        pending.push(...inlineRuns({ childNodes: [child] } as unknown as Node, base))
        continue
      }
      if (!(child instanceof Element)) continue
      const tag = child.localName
      if (SKIP.has(tag) || child.getAttribute('aria-hidden') === 'true' || child.hasAttribute('hidden')) continue
      if (!options.keepChrome && CHROME.has(tag)) continue
      if (!BLOCKS.has(tag)) {
        pending.push(...inlineRuns({ childNodes: [child] } as unknown as Node, base))
        continue
      }
      flush()
      if (/^h[1-6]$/.test(tag)) {
        const runs = tidy(inlineRuns(child, base)).map(({ text, href }) => ({ text, href }))
        if (runs.length) blocks.push({ type: 'heading', level: Number(tag[1]), runs })
      } else if (tag === 'p' || tag === 'dt' || tag === 'dd' || tag === 'figcaption' || tag === 'summary' || tag === 'address') paragraph(inlineRuns(child, base, tag === 'dt' ? { bold: true } : {}))
      else if (tag === 'ul' || tag === 'ol') list(child, 0)
      else if (tag === 'blockquote') {
        const runs = tidy(inlineRuns(child, base))
        if (runs.length) blocks.push({ type: 'quote', runs })
      } else if (tag === 'pre') {
        const text = child.textContent ?? ''
        if (text.trim()) blocks.push({ type: 'code', text: text.replace(/\n$/, '') })
      } else if (tag === 'hr') blocks.push({ type: 'rule' })
      else if (tag === 'table') {
        for (const row of child.querySelectorAll('tr')) {
          const cells = [...row.children].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
          if (cells.some(Boolean)) blocks.push({ type: 'line', text: cells.join('   |   ') })
        }
      } else visit(child)
    }
    flush()
  }
  visit(root)
  return { title, blocks, images }
}
