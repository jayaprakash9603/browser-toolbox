export interface InlineRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
  href?: string
}

export type DocBlock =
  | { type: 'heading'; level: number; runs: InlineRun[] }
  | { type: 'paragraph'; runs: InlineRun[] }
  | { type: 'line'; text: string }
  | {
      type: 'list'
      ordered: boolean
      index: number
      depth: number
      listId: number
      checked?: boolean
      runs: InlineRun[]
    }
  | { type: 'quote'; runs: InlineRun[] }
  | { type: 'code'; text: string }
  | { type: 'rule' }

export type PageSize = 'a4' | 'letter' | 'legal'
export type Orientation = 'portrait' | 'landscape'
export type MarginPreset = 'narrow' | 'normal' | 'wide'
export type FontFamily = 'sans' | 'serif' | 'mono'

export interface DocumentSettings {
  pageSize: PageSize
  orientation: Orientation
  margin: MarginPreset
  font: FontFamily
  /** Body size in points. */
  fontSize: number
  lineHeight: number
  pageNumbers: boolean
  /** Printed above the body when set. */
  title: string
  /** Interpret headings, lists, emphasis and code fences. */
  markdown: boolean
  /** Number every line; only used for plain text. */
  lineNumbers: boolean
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  pageSize: 'a4',
  orientation: 'portrait',
  margin: 'normal',
  font: 'sans',
  fontSize: 11,
  lineHeight: 1.4,
  pageNumbers: true,
  title: '',
  markdown: true,
  lineNumbers: false,
}

/** Page sizes in PostScript points (1/72 inch). */
export const PAGE_SIZES_PT: Record<PageSize, readonly [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
}

export const MARGINS_PT: Record<MarginPreset, number> = { narrow: 36, normal: 72, wide: 108 }

export function pageGeometry(settings: Pick<DocumentSettings, 'pageSize' | 'orientation' | 'margin'>) {
  const [short, long] = PAGE_SIZES_PT[settings.pageSize]
  const landscape = settings.orientation === 'landscape'
  return {
    width: landscape ? long : short,
    height: landscape ? short : long,
    margin: MARGINS_PT[settings.margin],
  }
}

const SAFE_HREF = /^(https?:|mailto:)/i

function safeHref(raw: string): string | undefined {
  const href = raw.trim()
  return SAFE_HREF.test(href) ? href : undefined
}

const INLINE_PATTERN =
  /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(\*\*|__)(?=\S)(.+?)(?<=\S)\4|(?<![\w*])\*(?=\S)(.+?)(?<=\S)\*(?!\*)|(?<![\w_])_(?=\S)(.+?)(?<=\S)_(?![\w_])|~~(?=\S)(.+?)(?<=\S)~~/g

function sameStyle(a: InlineRun, b: InlineRun): boolean {
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.code === !!b.code &&
    !!a.strike === !!b.strike &&
    a.href === b.href
  )
}

export function parseInline(text: string, base: Omit<InlineRun, 'text'> = {}): InlineRun[] {
  const runs: InlineRun[] = []
  const push = (run: InlineRun) => {
    if (!run.text) return
    const last = runs[runs.length - 1]
    if (last && sameStyle(last, run)) last.text += run.text
    else runs.push(run)
  }
  let cursor = 0
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) push({ ...base, text: text.slice(cursor, start) })
    const [, code, label, href, , bold, starItalic, underscoreItalic, strike] = match
    if (code !== undefined) push({ ...base, text: code, code: true })
    else if (label !== undefined) {
      const safe = safeHref(href)
      for (const run of parseInline(label, safe ? { ...base, href: safe } : base)) push(run)
    } else if (bold !== undefined) for (const run of parseInline(bold, { ...base, bold: true })) push(run)
    else if (starItalic !== undefined) for (const run of parseInline(starItalic, { ...base, italic: true })) push(run)
    else if (underscoreItalic !== undefined) {
      for (const run of parseInline(underscoreItalic, { ...base, italic: true })) push(run)
    } else if (strike !== undefined) for (const run of parseInline(strike, { ...base, strike: true })) push(run)
    cursor = start + match[0].length
  }
  if (cursor < text.length) push({ ...base, text: text.slice(cursor) })
  return runs
}

export function runsText(runs: InlineRun[]): string {
  return runs.map((run) => run.text).join('')
}

function splitLines(source: string): string[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** Turns plain text or Markdown into blocks every output format renders from. */
export function parseDocument(source: string, markdown: boolean): DocBlock[] {
  const lines = splitLines(source)
  if (!markdown) return lines.map((text) => ({ type: 'line', text }))

  const blocks: DocBlock[] = []
  let paragraph: string[] = []
  let quote: string[] = []
  let code: string[] | null = null
  let listId = 0
  let inList = false
  const counters = new Map<string, number>()

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', runs: parseInline(paragraph.join('\n')) })
    paragraph = []
  }
  const flushQuote = () => {
    if (quote.length) blocks.push({ type: 'quote', runs: parseInline(quote.join('\n')) })
    quote = []
  }
  const endList = () => {
    inList = false
    counters.clear()
  }

  for (const raw of lines) {
    if (code) {
      if (/^\s*```/.test(raw)) {
        blocks.push({ type: 'code', text: code.join('\n') })
        code = null
      } else {
        code.push(raw)
      }
      continue
    }
    if (/^\s*```/.test(raw)) {
      flushParagraph()
      flushQuote()
      endList()
      code = []
      continue
    }
    if (!raw.trim()) {
      flushParagraph()
      flushQuote()
      continue
    }

    let match: RegExpExecArray | null
    if ((match = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(raw))) {
      flushParagraph()
      flushQuote()
      endList()
      blocks.push({ type: 'heading', level: match[1].length, runs: parseInline(match[2]) })
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(raw)) {
      flushParagraph()
      flushQuote()
      endList()
      blocks.push({ type: 'rule' })
    } else if ((match = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(raw))) {
      flushParagraph()
      flushQuote()
      if (!inList) {
        listId += 1
        inList = true
      }
      const depth = Math.min(2, Math.floor(match[1].replace(/\t/g, '  ').length / 2))
      const ordered = match[3] !== undefined
      const key = `${depth}:${ordered ? 'o' : 'u'}`
      for (const existing of [...counters.keys()]) {
        if (Number(existing.split(':')[0]) > depth) counters.delete(existing)
      }
      const index = counters.has(key) ? (counters.get(key) ?? 0) + 1 : ordered ? Number(match[3]) : 1
      counters.set(key, index)
      blocks.push({
        type: 'list',
        ordered,
        index,
        depth,
        listId,
        checked: match[4] === undefined ? undefined : match[4] !== ' ',
        runs: parseInline(match[5]),
      })
    } else if ((match = /^\s*>\s?(.*)$/.exec(raw))) {
      flushParagraph()
      endList()
      quote.push(match[1])
    } else {
      flushQuote()
      if (inList && /^\s{2,}\S/.test(raw) && blocks[blocks.length - 1]?.type === 'list') {
        const last = blocks[blocks.length - 1] as Extract<DocBlock, { type: 'list' }>
        last.runs = [...last.runs, ...parseInline(`\n${raw.trim()}`)]
        continue
      }
      endList()
      paragraph.push(raw)
    }
  }
  if (code) blocks.push({ type: 'code', text: code.join('\n') })
  flushParagraph()
  flushQuote()
  return blocks
}

export function listMarker(block: Extract<DocBlock, { type: 'list' }>): string {
  if (block.checked !== undefined) return block.checked ? '[x]' : '[ ]'
  if (block.ordered) return `${block.index}.`
  return block.depth === 0 ? '•' : '–'
}

export function docToPlainText(blocks: DocBlock[], title = ''): string {
  const out: string[] = []
  if (title.trim()) out.push(title.trim(), '')
  blocks.forEach((block, index) => {
    const next = blocks[index + 1]
    switch (block.type) {
      case 'line':
        out.push(block.text)
        return
      case 'heading':
        out.push(runsText(block.runs), '')
        return
      case 'paragraph':
        out.push(runsText(block.runs), '')
        return
      case 'quote':
        out.push(...runsText(block.runs).split('\n').map((line) => `  ${line}`), '')
        return
      case 'code':
        out.push(...block.text.split('\n').map((line) => `    ${line}`), '')
        return
      case 'rule':
        out.push('----------', '')
        return
      case 'list':
        out.push(`${'  '.repeat(block.depth)}${listMarker(block)} ${runsText(block.runs).replace(/\n/g, ' ')}`)
        if (next?.type !== 'list' || next.listId !== block.listId) out.push('')
    }
  })
  while (out.length && out[out.length - 1] === '') out.pop()
  return `${out.join('\n')}\n`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function runsToHtml(runs: InlineRun[]): string {
  return runs
    .map((run) => {
      let html = escapeHtml(run.text).replace(/\n/g, '<br>')
      if (run.code) html = `<code>${html}</code>`
      if (run.bold) html = `<strong>${html}</strong>`
      if (run.italic) html = `<em>${html}</em>`
      if (run.strike) html = `<del>${html}</del>`
      if (run.href) html = `<a href="${escapeHtml(run.href)}">${html}</a>`
      return html
    })
    .join('')
}

export const FONT_STACKS: Record<FontFamily, string> = {
  sans: "Helvetica, Arial, 'Segoe UI', sans-serif",
  serif: "'Times New Roman', Times, Georgia, serif",
  mono: "'Courier New', Courier, ui-monospace, monospace",
}

/** Body markup only, so previews and full documents share it. */
export function docToHtmlBody(blocks: DocBlock[], settings: Pick<DocumentSettings, 'title' | 'lineNumbers'>): string {
  const html: string[] = []
  if (settings.title.trim()) html.push(`<h1 class="doc-title">${escapeHtml(settings.title.trim())}</h1>`)
  const openList: { id: number; ordered: boolean; depth: number }[] = []
  const closeLists = () => {
    while (openList.length) html.push(openList.pop()?.ordered ? '</ol>' : '</ul>')
  }
  const lines = blocks.filter((block) => block.type === 'line')
  if (lines.length === blocks.length && blocks.length > 0) {
    const width = String(lines.length).length
    const body = lines
      .map((block, index) => {
        const text = escapeHtml(block.text) || ' '
        return settings.lineNumbers
          ? `<span class="ln">${String(index + 1).padStart(width, ' ')}</span>${text}`
          : text
      })
      .join('\n')
    html.push(`<pre class="plain">${body}</pre>`)
    return html.join('\n')
  }
  for (const block of blocks) {
    if (block.type !== 'list') closeLists()
    switch (block.type) {
      case 'heading':
        html.push(`<h${block.level}>${runsToHtml(block.runs)}</h${block.level}>`)
        break
      case 'paragraph':
        html.push(`<p>${runsToHtml(block.runs)}</p>`)
        break
      case 'line':
        html.push(`<p class="line">${escapeHtml(block.text) || '&nbsp;'}</p>`)
        break
      case 'quote':
        html.push(`<blockquote>${runsToHtml(block.runs)}</blockquote>`)
        break
      case 'code':
        html.push(`<pre><code>${escapeHtml(block.text)}</code></pre>`)
        break
      case 'rule':
        html.push('<hr>')
        break
      case 'list': {
        if (openList.length && openList[0].id !== block.listId) closeLists()
        while (openList.length) {
          const top = openList[openList.length - 1]
          if (top.depth < block.depth || (top.depth === block.depth && top.ordered === block.ordered)) break
          html.push(top.ordered ? '</ol>' : '</ul>')
          openList.pop()
        }
        const top = openList[openList.length - 1]
        if (!top || top.depth < block.depth) {
          html.push(block.ordered ? `<ol start="${block.index}">` : '<ul>')
          openList.push({ id: block.listId, ordered: block.ordered, depth: block.depth })
        }
        const check = block.checked === undefined ? '' : `<input type="checkbox" disabled${block.checked ? ' checked' : ''}> `
        html.push(`<li${block.checked !== undefined ? ' class="task"' : ''}>${check}${runsToHtml(block.runs)}</li>`)
        break
      }
    }
  }
  closeLists()
  return html.join('\n')
}

export function docToHtmlDocument(blocks: DocBlock[], settings: DocumentSettings): string {
  const { width, height, margin } = pageGeometry(settings)
  const title = escapeHtml(settings.title.trim() || 'Document')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="One Panel">
<title>${title}</title>
<style>
@page { size: ${width}pt ${height}pt; margin: ${margin}pt; }
:root { color-scheme: light; }
body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: ${FONT_STACKS[settings.font]}; font-size: ${settings.fontSize}pt; line-height: ${settings.lineHeight}; }
main { box-sizing: border-box; max-width: ${width}pt; min-height: ${height}pt; margin: 24px auto; padding: ${margin}pt; background: #fff; box-shadow: 0 10px 30px rgb(15 23 42 / 0.12); }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.2em 0 0.4em; }
h1.doc-title { margin-top: 0; padding-bottom: 0.3em; border-bottom: 2px solid #4f46e5; }
p { margin: 0 0 0.7em; }
p.line { margin: 0; white-space: pre-wrap; }
pre { font-family: ${FONT_STACKS.mono}; font-size: 0.9em; white-space: pre-wrap; word-break: break-word; }
pre code { display: block; padding: 0.7em 0.9em; background: #f1f5f9; border-radius: 6px; }
pre.plain { margin: 0; ${settings.font === 'mono' ? '' : `font-family: ${FONT_STACKS[settings.font]}; font-size: 1em;`} }
pre.plain .ln { display: inline-block; min-width: 3ch; margin-right: 1.5ch; color: #94a3b8; text-align: right; user-select: none; }
code { font-family: ${FONT_STACKS.mono}; font-size: 0.92em; background: #f1f5f9; padding: 0.05em 0.3em; border-radius: 4px; }
blockquote { margin: 0 0 0.8em; padding: 0.2em 0 0.2em 1em; border-left: 3px solid #a5b4fc; color: #475569; font-style: italic; }
hr { border: 0; border-top: 1px solid #cbd5e1; margin: 1.2em 0; }
ul, ol { margin: 0 0 0.7em; padding-left: 1.6em; }
li.task { list-style: none; margin-left: -1.3em; }
a { color: #4338ca; }
@media print { body { background: #fff; } main { margin: 0; padding: 0; box-shadow: none; max-width: none; min-height: 0; } }
</style>
</head>
<body>
<main>
${docToHtmlBody(blocks, settings)}
</main>
</body>
</html>
`
}

function rtfEscape(text: string): string {
  let out = ''
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (char === '\\' || char === '{' || char === '}') out += `\\${char}`
    else if (char === '\n') out += '\\line '
    else if (char === '\t') out += '\\tab '
    else if (code < 0x80) out += char
    else if (code <= 0xffff) out += `\\u${code > 0x7fff ? code - 0x10000 : code}?`
    else {
      const high = 0xd800 + ((code - 0x10000) >> 10)
      const low = 0xdc00 + ((code - 0x10000) & 0x3ff)
      out += `\\u${high - 0x10000}?\\u${low - 0x10000}?`
    }
  }
  return out
}

function runsToRtf(runs: InlineRun[]): string {
  return runs
    .map((run) => {
      let body = rtfEscape(run.text)
      const flags = `${run.bold ? '\\b' : ''}${run.italic ? '\\i' : ''}${run.strike ? '\\strike' : ''}${run.code ? '\\f2' : ''}${run.href ? '\\ul\\cf2' : ''}`
      if (flags) body = `{${flags} ${body}}`
      if (run.href) body = `{\\field{\\*\\fldinst HYPERLINK "${run.href.replace(/"/g, '')}"}{\\fldrslt ${body}}}`
      return body
    })
    .join('')
}

const TWIPS_PER_PT = 20

export function docToRtf(blocks: DocBlock[], settings: DocumentSettings): string {
  const { width, height, margin } = pageGeometry(settings)
  const body = Math.round(settings.fontSize * 2)
  const font = settings.font === 'serif' ? 1 : settings.font === 'mono' ? 2 : 0
  const lineSpacing = Math.round(settings.lineHeight * 240)
  const base = `\\pard\\plain\\f${font}\\fs${body}\\sl${lineSpacing}\\slmult1`
  const parts: string[] = [
    '{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1',
    '{\\fonttbl{\\f0\\fswiss\\fcharset0 Helvetica;}{\\f1\\froman\\fcharset0 Times New Roman;}{\\f2\\fmodern\\fcharset0 Courier New;}}',
    '{\\colortbl;\\red15\\green23\\blue42;\\red67\\green56\\blue202;\\red100\\green116\\blue139;}',
    `{\\info{\\title ${rtfEscape(settings.title.trim() || 'Document')}}{\\doccomm One Panel}}`,
    `\\paperw${Math.round(width * TWIPS_PER_PT)}\\paperh${Math.round(height * TWIPS_PER_PT)}${settings.orientation === 'landscape' ? '\\landscape' : ''}`,
    `\\margl${margin * TWIPS_PER_PT}\\margr${margin * TWIPS_PER_PT}\\margt${margin * TWIPS_PER_PT}\\margb${margin * TWIPS_PER_PT}`,
  ]
  if (settings.pageNumbers) {
    parts.push(`{\\footer\\pard\\qc\\f${font}\\fs${Math.max(14, body - 6)}\\cf3 {\\field{\\*\\fldinst PAGE}{\\fldrslt 1}}\\par}`)
  }
  if (settings.title.trim()) {
    parts.push(`${base}\\sa240\\b\\fs${Math.round(body * 1.9)} ${rtfEscape(settings.title.trim())}\\par`)
  }
  const lineCount = blocks.filter((block) => block.type === 'line').length
  const numberWidth = String(lineCount).length
  let lineNumber = 0
  for (const block of blocks) {
    switch (block.type) {
      case 'line': {
        lineNumber += 1
        const prefix = settings.lineNumbers
          ? `{\\cf3 ${String(lineNumber).padStart(numberWidth, ' ')}  }`
          : ''
        parts.push(`${base}\\sa0 ${prefix}${rtfEscape(block.text)}\\par`)
        break
      }
      case 'heading': {
        const scale = [1.75, 1.45, 1.25, 1.1, 1, 1][block.level - 1] ?? 1
        parts.push(`${base}\\sb240\\sa120\\keepn\\b\\fs${Math.round(body * scale)} ${runsToRtf(block.runs)}\\par`)
        break
      }
      case 'paragraph':
        parts.push(`${base}\\sa160 ${runsToRtf(block.runs)}\\par`)
        break
      case 'quote':
        parts.push(`${base}\\li360\\sa160\\i\\cf3 ${runsToRtf(block.runs)}\\par`)
        break
      case 'code':
        parts.push(`${base}\\f2\\fs${Math.max(14, body - 2)}\\sa160 ${rtfEscape(block.text)}\\par`)
        break
      case 'rule':
        parts.push(`${base}\\sa160\\brdrb\\brdrs\\brdrw10\\brsp20 \\par`)
        break
      case 'list': {
        const indent = 360 * (block.depth + 1)
        parts.push(`${base}\\sa60\\fi-280\\li${indent} ${rtfEscape(listMarker(block))}\\tab ${runsToRtf(block.runs)}\\par`)
        break
      }
    }
  }
  parts.push('}')
  return parts.join('\n')
}

/** File-name safe stem from a title or the first meaningful line. */
export function documentStem(title: string, source: string, fallback = 'document'): string {
  const first = title.trim() || source.split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, '') || ''
  const cleaned = [...first]
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
  return cleaned || fallback
}
