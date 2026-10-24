export type ReadableBlockType = 'heading' | 'paragraph' | 'list' | 'quote' | 'code'

export interface ReadableBlock {
  type: ReadableBlockType
  text: string
}

export interface ReadablePage {
  title: string
  url: string
  lang: string
  blocks: ReadableBlock[]
}

export const MAX_READABLE_CHARS = 150_000

const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'object',
  'embed',
  'video',
  'audio',
  'picture',
  'img',
  'map',
  'button',
  'select',
  'option',
  'input',
  'textarea',
  'dialog',
  'menu',
  'nav',
  'aside',
  'footer',
])

const SKIP_ROLES = new Set([
  'navigation',
  'banner',
  'contentinfo',
  'complementary',
  'search',
  'dialog',
  'alertdialog',
  'menu',
  'menubar',
  'toolbar',
  'tablist',
  'button',
  'tooltip',
  'alert',
  'marquee',
  'timer',
])

const BLOCK_TYPES: Record<string, ReadableBlockType> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  p: 'paragraph',
  dt: 'paragraph',
  dd: 'paragraph',
  figcaption: 'paragraph',
  caption: 'paragraph',
  summary: 'paragraph',
  td: 'paragraph',
  th: 'paragraph',
  li: 'list',
  blockquote: 'quote',
}

const BREAK_TAGS = new Set([
  'div',
  'section',
  'article',
  'main',
  'header',
  'ul',
  'ol',
  'dl',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'figure',
  'details',
  'address',
  'form',
  'fieldset',
  'hgroup',
  'center',
  'br',
  'hr',
])

const INLINE_DISPLAYS = new Set(['inline', 'contents', 'ruby'])
const SPACED_DISPLAYS = new Set(['inline-block', 'inline-flex', 'inline-grid', 'inline-table'])
const HIDDEN_CLASS = /(?:^|\s)(?:sr-only|visually-hidden|screen-reader-text|skip-link|skip-to-content)(?:\s|$)/i
const HAS_WORD = /[\p{L}\p{N}]/u
const SKIP_LINK_TEXT = /^skip to (?:the )?(?:main )?(?:content|navigation|search)$/i
const ARTICLE_SELECTOR = 'article, [itemprop="articleBody"], [role="article"]'
const MAIN_SELECTOR = 'main, [role="main"]'
const CONTENT_SELECTOR = `${ARTICLE_SELECTOR}, ${MAIN_SELECTOR}`

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function textLength(el: Element): number {
  return collapse(el.textContent ?? '').length
}

function largest(elements: Element[]): { el: Element | null; length: number } {
  let best: Element | null = null
  let length = 0
  for (const el of elements) {
    const current = textLength(el)
    if (current > length) {
      best = el
      length = current
    }
  }
  return { el: best, length }
}

/** The element that holds the page's main reading content, falling back to the body. */
export function pickContentRoot(doc: Document): Element {
  const articles = [...doc.querySelectorAll(ARTICLE_SELECTOR)]
  const main = largest([...doc.querySelectorAll(MAIN_SELECTOR)])
  const article = largest(articles)
  const isFeed = articles.length > 3 && main.el !== null
  if (article.el && article.length >= 400 && !isFeed) return article.el
  if (main.el && main.length >= 200) return main.el
  return doc.body ?? doc.documentElement
}

class BlockCollector {
  readonly blocks: ReadableBlock[] = []
  type: ReadableBlockType = 'paragraph'
  chars = 0
  private parts: string[] = []

  get full(): boolean {
    return this.chars >= MAX_READABLE_CHARS
  }

  append(text: string) {
    this.parts.push(text)
  }

  push(type: ReadableBlockType, raw: string) {
    const text = type === 'code' ? raw.replace(/\n{3,}/g, '\n\n').trim() : collapse(raw)
    if (!text || !HAS_WORD.test(text) || SKIP_LINK_TEXT.test(text)) return
    const last = this.blocks.at(-1)
    if (last && last.text === text) return
    this.blocks.push({ type, text })
    this.chars += text.length
  }

  flush() {
    const raw = this.parts.join('')
    this.parts = []
    this.push(this.type, raw)
  }
}

interface WalkContext {
  root: Element
  out: BlockCollector
  view: Window | null
  /** Fixed overlays are usually cookie banners, chat widgets and sticky bars. */
  skipFixed: boolean
}

function isHidden(el: Element, style: CSSStyleDeclaration | null, skipFixed: boolean): boolean {
  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true
  if (el.getAttribute('aria-modal') === 'true') return true
  if (HIDDEN_CLASS.test(el.getAttribute('class') ?? '')) return true
  if (!style) return false
  return style.display === 'none' || style.visibility === 'hidden' || (skipFixed && style.position === 'fixed')
}

function shouldSkip(el: Element, root: Element): boolean {
  const tag = el.localName
  if (SKIP_TAGS.has(tag)) return true
  const role = el.getAttribute('role')
  if (role && SKIP_ROLES.has(role)) return true
  if (tag === 'header' && el !== root) return !el.parentElement?.closest(CONTENT_SELECTOR)
  return false
}

function walkChildren(el: Element, ctx: WalkContext) {
  for (const child of el.childNodes) walk(child, ctx)
}

function walk(node: Node, ctx: WalkContext) {
  const { root, out, view } = ctx
  if (out.full) return
  if (node.nodeType === Node.TEXT_NODE) {
    out.append(node.nodeValue ?? '')
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const el = node as Element
  if (el !== root && shouldSkip(el, root)) return
  const style = view ? view.getComputedStyle(el) : null
  if (el !== root && isHidden(el, style, ctx.skipFixed)) return

  const tag = el.localName
  if (tag === 'pre') {
    out.flush()
    out.push('code', el.textContent ?? '')
    return
  }

  const blockType = BLOCK_TYPES[tag]
  if (blockType) {
    out.flush()
    const outer = out.type
    out.type = blockType
    walkChildren(el, ctx)
    out.flush()
    out.type = outer
    return
  }

  const display = style?.display ?? ''
  const breaks = BREAK_TAGS.has(tag) || (display !== '' && !INLINE_DISPLAYS.has(display) && !SPACED_DISPLAYS.has(display))
  if (breaks) {
    out.flush()
    walkChildren(el, ctx)
    out.flush()
    return
  }

  const spaced = SPACED_DISPLAYS.has(display)
  if (spaced) out.append(' ')
  walkChildren(el, ctx)
  if (spaced) out.append(' ')
}

function collectBlocks(doc: Document, root: Element, skipFixed: boolean): ReadableBlock[] {
  const out = new BlockCollector()
  walk(root, { root, out, view: doc.defaultView, skipFixed })
  out.flush()
  return out.blocks
}

/** Extracts the readable article of a page as separate headings, paragraphs and list items. */
export function extractReadablePage(doc: Document): ReadablePage {
  const root = pickContentRoot(doc)
  let blocks = collectBlocks(doc, root, true)
  if (blocks.length === 0) blocks = collectBlocks(doc, root, false)

  const title = collapse(doc.title)
  if (title && blocks[0]?.type !== 'heading' && !blocks.some((block) => block.text === title)) {
    blocks.unshift({ type: 'heading', text: title })
  }

  return {
    title,
    url: doc.location?.href ?? '',
    lang: doc.documentElement.lang || '',
    blocks,
  }
}

/** Splits free text into paragraphs: blank lines separate paragraphs, otherwise each line does. */
export function textToBlocks(text: string): ReadableBlock[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []
  const paragraphs = /\n[ \t]*\n/.test(normalized)
    ? normalized.split(/\n[ \t]*\n+/)
    : normalized.split(/\n+/)
  return paragraphs
    .map((paragraph) => collapse(paragraph))
    .filter((paragraph) => HAS_WORD.test(paragraph))
    .slice(0, 5000)
    .map((paragraph) => ({ type: 'paragraph' as const, text: paragraph }))
}

export function extractSelection(doc: Document): ReadablePage {
  const selected = doc.getSelection()?.toString() ?? ''
  return {
    title: collapse(doc.title),
    url: doc.location?.href ?? '',
    lang: doc.documentElement.lang || '',
    blocks: textToBlocks(selected.slice(0, MAX_READABLE_CHARS)),
  }
}
