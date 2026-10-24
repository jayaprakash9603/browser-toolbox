import type { Note } from './notesService'

/** A single text replacement: replace `text.slice(from, to)` with `insert`, then select `selStart..selEnd`. */
export interface TextEdit {
  from: number
  to: number
  insert: string
  selStart: number
  selEnd: number
}

export function applyEdit(text: string, edit: TextEdit): string {
  return text.slice(0, edit.from) + edit.insert + text.slice(edit.to)
}

export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
  placeholder = '',
): TextEdit {
  const selected = text.slice(start, end)
  if (
    start >= before.length &&
    text.slice(start - before.length, start) === before &&
    text.slice(end, end + after.length) === after
  ) {
    return {
      from: start - before.length,
      to: end + after.length,
      insert: selected,
      selStart: start - before.length,
      selEnd: end - before.length,
    }
  }
  if (selected.length > before.length + after.length && selected.startsWith(before) && selected.endsWith(after)) {
    const inner = selected.slice(before.length, selected.length - after.length)
    return { from: start, to: end, insert: inner, selStart: start, selEnd: start + inner.length }
  }
  const inner = selected || placeholder
  return {
    from: start,
    to: end,
    insert: before + inner + after,
    selStart: start + before.length,
    selEnd: start + before.length + inner.length,
  }
}

export type LineKind = 'bullet' | 'ordered' | 'check' | 'quote' | 'heading'

const LIST_PREFIX = /^(\s*)(- \[[ xX]\] |[-*+] |\d+[.)] )/
const KIND_PREFIX: Record<LineKind, RegExp> = {
  bullet: /^(\s*)[-*+] (?!\[[ xX]\] )/,
  ordered: /^(\s*)\d+[.)] /,
  check: /^(\s*)- \[[ xX]\] /,
  quote: /^(\s*)> ?/,
  heading: /^(\s*)#{1,6} /,
}

function lineBounds(text: string, start: number, end: number): [number, number] {
  const from = text.lastIndexOf('\n', start - 1) + 1
  const adjustedEnd = end > start && text[end - 1] === '\n' ? end - 1 : end
  const nl = text.indexOf('\n', adjustedEnd)
  return [from, nl === -1 ? text.length : nl]
}

export function toggleLinePrefix(text: string, start: number, end: number, kind: LineKind): TextEdit {
  const [from, to] = lineBounds(text, start, end)
  const lines = text.slice(from, to).split('\n')
  const content = lines.filter((l) => l.trim() !== '')
  const remove = content.length > 0 && content.every((l) => KIND_PREFIX[kind].test(l))
  let n = 0
  const next = lines.map((line) => {
    if (remove) return line.replace(KIND_PREFIX[kind], '$1')
    if (line.trim() === '' && lines.length > 1) return line
    const base = kind === 'quote' || kind === 'heading' ? line : line.replace(LIST_PREFIX, '$1')
    const indent = /^\s*/.exec(base)?.[0] ?? ''
    const rest = base.slice(indent.length)
    n += 1
    const prefix =
      kind === 'bullet'
        ? '- '
        : kind === 'ordered'
          ? `${n}. `
          : kind === 'check'
            ? '- [ ] '
            : kind === 'quote'
              ? '> '
              : '## '
    return indent + prefix + rest
  })
  const insert = next.join('\n')
  if (lines.length === 1) {
    const delta = insert.length - (to - from)
    const caret = Math.max(from, end + delta)
    return { from, to, insert, selStart: start === end ? caret : Math.max(from, start + delta), selEnd: caret }
  }
  return { from, to, insert, selStart: from, selEnd: from + insert.length }
}

/** Markdown-style list continuation for the Enter key. Returns null when Enter should behave normally. */
export function continueList(text: string, caret: number): TextEdit | null {
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1
  const line = text.slice(lineStart, caret)
  const match = /^(\s*)(- \[[ xX]\] |[-*+] |(\d+)([.)]) |> )/.exec(line)
  if (!match) return null
  if (line.length === match[0].length) {
    return { from: lineStart, to: caret, insert: '', selStart: lineStart, selEnd: lineStart }
  }
  const [, indent, marker, num, delim] = match
  const nextMarker = num
    ? `${Number(num) + 1}${delim} `
    : marker.startsWith('- [')
      ? '- [ ] '
      : marker
  const insert = `\n${indent}${nextMarker}`
  return { from: caret, to: caret, insert, selStart: caret + insert.length, selEnd: caret + insert.length }
}

export function toggleCheckboxAtLine(text: string, lineIndex: number): string {
  const lines = text.split('\n')
  const line = lines[lineIndex]
  if (line === undefined) return text
  lines[lineIndex] = line.replace(/^(\s*- \[)([ xX])(\] )/, (_, a: string, mark: string, b: string) =>
    `${a}${mark === ' ' ? 'x' : ' '}${b}`,
  )
  return lines.join('\n')
}

export interface TextStats {
  words: number
  characters: number
  lines: number
}

export function textStats(text: string): TextStats {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0
  return { words, characters: [...text].length, lines: text === '' ? 1 : text.split('\n').length }
}

export function caretPosition(text: string, caret: number): { line: number; column: number } {
  const before = text.slice(0, caret)
  const line = before.split('\n').length
  const column = caret - (before.lastIndexOf('\n') + 1) + 1
  return { line, column }
}

export function lineOffset(text: string, line: number): number {
  if (line <= 1) return 0
  let offset = 0
  for (let i = 1; i < line; i += 1) {
    const nl = text.indexOf('\n', offset)
    if (nl === -1) return text.length
    offset = nl + 1
  }
  return offset
}

export interface FindOptions {
  matchCase: boolean
  wholeWord: boolean
}

export interface Match {
  start: number
  end: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findRegExp(query: string, options: FindOptions): RegExp {
  const source = escapeRegExp(query)
  return new RegExp(options.wholeWord ? `(?<![\\p{L}\\p{N}_])${source}(?![\\p{L}\\p{N}_])` : source, options.matchCase ? 'gu' : 'giu')
}

export function findMatches(text: string, query: string, options: FindOptions): Match[] {
  if (!query) return []
  const out: Match[] = []
  for (const m of text.matchAll(findRegExp(query, options))) {
    out.push({ start: m.index, end: m.index + m[0].length })
    if (out.length >= 5000) break
  }
  return out
}

export function replaceAll(text: string, query: string, replacement: string, options: FindOptions): { text: string; count: number } {
  if (!query) return { text, count: 0 }
  let count = 0
  const next = text.replace(findRegExp(query, options), () => {
    count += 1
    return replacement
  })
  return { text: next, count }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeHref(raw: string): string | null {
  const href = raw.replace(/&amp;/g, '&').trim()
  return /^(https?:|mailto:)/i.test(href) ? escapeHtml(href) : null
}

/** Inline markdown on already-escaped text. */
function inline(escaped: string): string {
  const codes: string[] = []
  let out = escaped.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`)
    return `\uE000${codes.length - 1}\uE001`
  })
  out = out
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => {
      const safe = safeHref(href)
      return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>` : whole
    })
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (whole, lead: string, url: string) => {
      const safe = safeHref(url)
      return safe ? `${lead}<a href="${safe}" target="_blank" rel="noopener noreferrer">${url}</a>` : whole
    })
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/==(?=\S)([\s\S]*?\S)==/g, '<mark>$1</mark>')
  return out.replace(/\uE000(\d+)\uE001/g, (_, i: string) => codes[Number(i)])
}

/**
 * Small, dependency-free markdown renderer. All input is HTML-escaped before any markup is added,
 * so the output is safe for innerHTML. Checkbox items carry `data-line` so the preview can toggle them.
 */
export function markdownToHtml(markdown: string, { interactive = false } = {}): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  let paragraph: string[] = []
  let inCode = false
  let code: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (list) html.push(`</${list}>`)
    list = null
  }
  const openList = (kind: 'ul' | 'ol') => {
    if (list !== kind) {
      closeList()
      html.push(`<${kind}>`)
      list = kind
    }
  }

  lines.forEach((raw, index) => {
    if (/^\s*```/.test(raw)) {
      if (inCode) {
        html.push(`<pre><code>${code.join('\n')}</code></pre>`)
        code = []
        inCode = false
      } else {
        flushParagraph()
        closeList()
        inCode = true
      }
      return
    }
    const line = escapeHtml(raw)
    if (inCode) {
      code.push(line)
      return
    }
    let m: RegExpExecArray | null
    if (line.trim() === '') {
      flushParagraph()
      closeList()
    } else if ((m = /^(#{1,6}) (.*)$/.exec(line))) {
      flushParagraph()
      closeList()
      html.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushParagraph()
      closeList()
      html.push('<hr>')
    } else if ((m = /^\s*- \[([ xX])\] (.*)$/.exec(line))) {
      flushParagraph()
      openList('ul')
      const checked = m[1] !== ' '
      const attrs = interactive ? ` data-line="${index}"` : ' disabled'
      html.push(
        `<li class="task${checked ? ' done' : ''}"><input type="checkbox"${checked ? ' checked' : ''}${attrs}> <span>${inline(m[2])}</span></li>`,
      )
    } else if ((m = /^\s*[-*+] (.*)$/.exec(line))) {
      flushParagraph()
      openList('ul')
      html.push(`<li>${inline(m[1])}</li>`)
    } else if ((m = /^\s*\d+[.)] (.*)$/.exec(line))) {
      flushParagraph()
      openList('ol')
      html.push(`<li>${inline(m[1])}</li>`)
    } else if ((m = /^&gt; ?(.*)$/.exec(line))) {
      flushParagraph()
      closeList()
      html.push(`<blockquote>${inline(m[1])}</blockquote>`)
    } else {
      closeList()
      paragraph.push(line)
    }
  })
  if (inCode) html.push(`<pre><code>${code.join('\n')}</code></pre>`)
  flushParagraph()
  closeList()
  return html.join('\n')
}

/** Strips markdown syntax for plain-text consumers (PDF, previews). */
export function markdownToPlain(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => !/^\s*```/.test(l))
    .map((l) =>
      l
        .replace(/^(#{1,6}) /, '')
        .replace(/^(\s*)- \[[xX]\] /, '$1☑ ')
        .replace(/^(\s*)- \[ \] /, '$1☐ ')
        .replace(/^(\s*)[-*+] /, '$1• ')
        .replace(/^> ?/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/==(.+?)==/g, '$1')
        .replace(/<\/?u>/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)'),
    )
    .join('\n')
}

export function noteDisplayTitle(note: Pick<Note, 'title' | 'body'>, fallback: string): string {
  if (note.title.trim()) return note.title.trim()
  const first = markdownToPlain(note.body)
    .split('\n')
    .find((l) => l.trim())
  return first ? first.trim().slice(0, 80) : fallback
}

export function noteSnippet(note: Pick<Note, 'title' | 'body'>): string {
  const lines = markdownToPlain(note.body)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const rest = note.title.trim() ? lines : lines.slice(1)
  return rest.join(' ').slice(0, 140)
}

export function safeFilename(name: string, fallback = 'note'): string {
  const cleaned = [...name]
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || fallback
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

export function noteToMarkdown(note: Note, title: string): string {
  return note.title.trim() ? `# ${title}\n\n${note.body}` : note.body
}

export function noteToHtmlDocument(note: Note, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:"Segoe UI",system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1.25rem;line-height:1.6;color:#1f2328}
h1,h2,h3{line-height:1.25}pre{background:#f4f4f5;padding:.75rem;border-radius:6px;overflow:auto}
code{font-family:Consolas,monospace;background:#f4f4f5;padding:0 .25rem;border-radius:4px}
blockquote{border-left:3px solid #d0d7de;margin:0;padding-left:1rem;color:#57606a}
li.task{list-style:none;margin-left:-1.25rem}li.task.done span{text-decoration:line-through;color:#6e7781}
.meta{color:#6e7781;font-size:.85rem}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">${escapeHtml(formatTimestamp(new Date(note.updatedAt)))}</p>
${markdownToHtml(note.body)}
</body>
</html>
`
}

export interface NotesBackup {
  app: 'browser-toolbox-notes'
  version: 1
  exportedAt: number
  notes: Note[]
}

export function notesToBackup(notes: Note[]): string {
  const backup: NotesBackup = { app: 'browser-toolbox-notes', version: 1, exportedAt: Date.now(), notes }
  return JSON.stringify(backup, null, 2)
}

/** Parses a JSON backup (ours, or a bare array of notes). Throws on anything unrecognisable. */
export function parseBackup(json: string): Partial<Note>[] {
  const data: unknown = JSON.parse(json)
  const list = Array.isArray(data) ? data : (data as { notes?: unknown } | null)?.notes
  if (!Array.isArray(list)) throw new Error('Not a notes backup')
  return list.filter(
    (n): n is Partial<Note> => typeof n === 'object' && n !== null && ('body' in n || 'title' in n),
  )
}

/** Splits an imported text/markdown file into a note title and body. */
export function textFileToNote(filename: string, content: string): { title: string; body: string } {
  const body = content.replace(/\r\n?/g, '\n')
  const heading = /^# (.+)\n+/.exec(body)
  if (heading) return { title: heading[1].trim(), body: body.slice(heading[0].length) }
  return { title: filename.replace(/\.(md|markdown|txt)$/i, ''), body }
}
