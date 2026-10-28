import type { PageText, TextRun } from './pdfjs'
import { parseDocument, type DocBlock } from '../files/document'

/** Runs that share a baseline, left to right. Coordinates are display points. */
export interface TextLine {
  runs: TextRun[]
  text: string
  x: number
  y: number
  w: number
  h: number
  size: number
  bold: boolean
}

/** Lines that read as one paragraph. */
export interface TextBlock {
  lines: TextLine[]
  text: string
  x: number
  y: number
  w: number
  h: number
  size: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function joinRuns(runs: TextRun[]): string {
  let text = ''
  let end: number | null = null
  for (const run of runs) {
    if (end !== null && run.x - end > run.size * 0.18 && !text.endsWith(' ') && !run.str.startsWith(' ')) text += ' '
    text += run.str
    end = run.x + run.w
  }
  return text.replace(/\s+/g, ' ').trim()
}

function lineOf(runs: TextRun[]): TextLine {
  runs.sort((a, b) => a.x - b.x)
  const x = Math.min(...runs.map((run) => run.x))
  const y = Math.min(...runs.map((run) => run.y))
  const right = Math.max(...runs.map((run) => run.x + run.w))
  const bottom = Math.max(...runs.map((run) => run.y + run.h))
  const chars = runs.reduce((sum, run) => sum + run.str.length, 0) || 1
  const size = runs.reduce((sum, run) => sum + run.size * run.str.length, 0) / chars
  const boldChars = runs.reduce((sum, run) => sum + (run.bold ? run.str.trim().length : 0), 0)
  return { runs, text: joinRuns(runs), x, y, w: right - x, h: bottom - y, size, bold: boldChars >= chars * 0.8 }
}

/** Groups runs into lines by baseline, top to bottom. */
export function groupLines(runs: TextRun[]): TextLine[] {
  const sorted = runs.filter((run) => run.str.trim()).sort((a, b) => a.y + a.h - (b.y + b.h) || a.x - b.x)
  const groups: TextRun[][] = []
  for (const run of sorted) {
    const baseline = run.y + run.h
    const group = groups.find((candidate) => {
      const last = candidate[candidate.length - 1]
      return Math.abs(last.y + last.h - baseline) < Math.min(last.size, run.size) * 0.45
    })
    if (group) group.push(run)
    else groups.push([run])
  }
  return groups.map(lineOf).filter((line) => line.text).sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Splits a line where the gap between runs is wide enough to be a column break. */
export function lineCells(line: TextLine): { text: string; x: number; right: number }[] {
  const cells: { runs: TextRun[] }[] = []
  let end: number | null = null
  for (const run of line.runs) {
    if (end === null || run.x - end > Math.max(run.size * 1.4, 9)) cells.push({ runs: [run] })
    else cells[cells.length - 1].runs.push(run)
    end = run.x + run.w
  }
  return cells
    .map(({ runs }) => ({ text: joinRuns(runs), x: runs[0].x, right: runs[runs.length - 1].x + runs[runs.length - 1].w }))
    .filter((cell) => cell.text)
}

/** Groups lines into paragraphs by spacing, size and indentation. */
export function groupBlocks(lines: TextLine[]): TextBlock[] {
  const blocks: TextLine[][] = []
  for (const line of lines) {
    const block = blocks[blocks.length - 1]
    const last = block?.[block.length - 1]
    const joins =
      last &&
      Math.abs(line.size - last.size) <= last.size * 0.15 &&
      line.y - (last.y + last.h) < last.size * 0.75 &&
      line.y >= last.y &&
      line.x < last.x + last.w &&
      last.x < line.x + line.w &&
      line.bold === last.bold
    if (joins) block.push(line)
    else blocks.push([line])
  }
  return blocks.map((group) => {
    const x = Math.min(...group.map((line) => line.x))
    const y = Math.min(...group.map((line) => line.y))
    const right = Math.max(...group.map((line) => line.x + line.w))
    const bottom = Math.max(...group.map((line) => line.y + line.h))
    const text = group
      .map((line) => line.text)
      .join('\n')
      .replace(/(\w)-\n(\w)/g, '$1$2')
      .replace(/\n/g, ' ')
    return { lines: group, text, x, y, w: right - x, h: bottom - y, size: group[0].size }
  })
}

/**
 * Turns the lines of one page into rows and columns: cells start where runs leave a
 * wide gap, and cell positions are snapped to column anchors shared by all rows.
 */
export function linesToTable(lines: TextLine[]): string[][] {
  const rows = lines.map(lineCells).filter((cells) => cells.length)
  if (!rows.length) return []
  const starts = rows.flat().map((cell) => cell.x).sort((a, b) => a - b)
  const anchors: number[] = []
  for (const x of starts) {
    if (!anchors.length || x - anchors[anchors.length - 1] > 12) anchors.push(x)
  }
  return rows.map((cells) => {
    const row: string[] = new Array(anchors.length).fill('')
    for (const cell of cells) {
      let column = 0
      for (let index = 0; index < anchors.length; index += 1) if (anchors[index] <= cell.x + 6) column = index
      row[column] = row[column] ? `${row[column]} ${cell.text}` : cell.text
    }
    return row
  }).map((row) => {
    let last = row.length
    while (last > 1 && !row[last - 1]) last -= 1
    return row.slice(0, last)
  })
}

/** Drops columns that are empty in every row. */
export function compactTable(rows: string[][]): string[][] {
  const width = Math.max(0, ...rows.map((row) => row.length))
  const keep = Array.from({ length: width }, (_, column) => rows.some((row) => row[column]?.trim()))
  return rows.map((row) => row.filter((_, column) => keep[column]))
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

export interface MarkdownOptions {
  headings: boolean
  links: boolean
  tables: boolean
  pageBreaks: boolean
}

const BULLET = /^[•●○◦▪▫■□‣⁃∙·\-–*]\s+/
const NUMBERED = /^(\d{1,3}|[a-z])[.)]\s+/i

function bodySize(pages: PageText[]): number {
  const counts = new Map<number, number>()
  for (const page of pages) {
    for (const run of page.runs) {
      const size = Math.round(run.size * 2) / 2
      counts.set(size, (counts.get(size) ?? 0) + run.str.length)
    }
  }
  let best = 11
  let most = 0
  for (const [size, count] of counts) {
    if (count > most) {
      most = count
      best = size
    }
  }
  return best
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]])/g, '\\$1')
}

function inlineMarkdown(line: TextLine, links: PageText['links'], options: MarkdownOptions, plainBold: boolean): string {
  let out = ''
  let end: number | null = null
  for (const run of line.runs) {
    if (end !== null && run.x - end > run.size * 0.18 && !out.endsWith(' ') && !run.str.startsWith(' ')) out += ' '
    let text = escapeMarkdown(run.str)
    const trimmed = text.trim()
    if (trimmed) {
      if (run.bold && !plainBold) text = text.replace(trimmed, `**${trimmed}**`)
      else if (run.italic) text = text.replace(trimmed, `_${trimmed}_`)
      if (options.links) {
        const link = links.find((candidate) => run.x + run.w / 2 >= candidate.x && run.x + run.w / 2 <= candidate.x + candidate.w && run.y + run.h / 2 >= candidate.y - 2 && run.y + run.h / 2 <= candidate.y + candidate.h + 2)
        if (link) text = text.replace(text.trim(), `[${text.trim()}](${link.url})`)
      }
    }
    out += text
    end = run.x + run.w
  }
  return out.replace(/\*\*\s*\*\*/g, '').replace(/\s+/g, ' ').trim()
}

function tableMarkdown(rows: string[][]): string {
  const width = Math.max(...rows.map((row) => row.length))
  const cell = (value = '') => value.replace(/\|/g, '\\|')
  const line = (row: string[]) => `| ${Array.from({ length: width }, (_, index) => cell(row[index])).join(' | ')} |`
  return [line(rows[0]), `|${' --- |'.repeat(width)}`, ...rows.slice(1).map(line)].join('\n')
}

/** Rebuilds headings, lists, emphasis, links and simple tables from positioned text. */
export function pagesToMarkdown(pages: PageText[], options: MarkdownOptions): string {
  const body = bodySize(pages)
  const out: string[] = []
  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0 && options.pageBreaks) out.push('---')
    const lines = groupLines(page.runs)
    let paragraph: string[] = []
    let lastLine: TextLine | null = null
    const flush = () => {
      if (paragraph.length) out.push(paragraph.join(' ').replace(/(\w)- (\w)/g, '$1$2'))
      paragraph = []
    }
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]

      if (options.tables) {
        const run: TextLine[] = []
        let cursor = index
        while (cursor < lines.length && lineCells(lines[cursor]).length >= 2) run.push(lines[cursor++])
        if (run.length >= 3) {
          const rows = compactTable(linesToTable(run))
          const columns = Math.max(...rows.map((row) => row.length))
          if (columns >= 2 && rows.every((row) => row.length >= columns - 1)) {
            flush()
            out.push(tableMarkdown(rows))
            index = cursor - 1
            lastLine = run[run.length - 1]
            continue
          }
        }
      }

      const ratio = line.size / body
      const short = line.text.length < 90
      const level = !options.headings ? 0 : ratio >= 1.6 ? 1 : ratio >= 1.3 ? 2 : ratio >= 1.12 || (line.bold && short && !/[.:;,]$/.test(line.text)) ? 3 : 0
      const text = inlineMarkdown(line, page.links, options, level > 0)
      if (!text) continue

      if (level) {
        flush()
        const previous = out[out.length - 1]
        const marker = '#'.repeat(level)
        if (previous?.startsWith(`${marker} `) && lastLine && line.y - (lastLine.y + lastLine.h) < line.size * 0.6) out[out.length - 1] = `${previous} ${text}`
        else out.push(`${marker} ${text}`)
      } else if (BULLET.test(line.text)) {
        flush()
        out.push(`- ${text.replace(/^\\?[•●○◦▪▫■□‣⁃∙·\-–*]\s+/, '')}`)
      } else if (NUMBERED.test(line.text)) {
        flush()
        const number = NUMBERED.exec(line.text)?.[1] ?? '1'
        out.push(`${/\d/.test(number) ? number : '1'}. ${text.replace(NUMBERED, '')}`)
      } else {
        const gap = lastLine ? line.y - (lastLine.y + lastLine.h) : 0
        const continuesList = !paragraph.length && lastLine && /^(- |\d+\. )/.test(out[out.length - 1] ?? '') && gap < line.size * 0.5 && line.x > lastLine.x - 2
        if (continuesList) out[out.length - 1] = `${out[out.length - 1]} ${text}`
        else {
          if (lastLine && (gap > line.size * 0.7 || Math.abs(line.size - lastLine.size) > 1)) flush()
          paragraph.push(text)
        }
      }
      lastLine = line
    }
    flush()
  })
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/** Structured Word blocks with headings, lists, emphasis and links from positioned PDF text. */
export function pagesToDocBlocks(
  pages: PageText[],
  options: MarkdownOptions & { pageHeadings?: boolean; pageNumbers?: number[] },
): DocBlock[] {
  if (pages.length === 0) return []
  const layout: MarkdownOptions = {
    headings: options.headings,
    links: options.links,
    tables: options.tables,
    pageBreaks: false,
  }
  if (options.pageHeadings) {
    const blocks: DocBlock[] = []
    pages.forEach((page, index) => {
      if (index > 0) blocks.push({ type: 'rule' })
      const label = options.pageNumbers?.[index] ?? index + 1
      blocks.push({ type: 'heading', level: 2, runs: [{ text: `Page ${label}` }] })
      blocks.push(...parseDocument(pagesToMarkdown([page], layout), true))
    })
    return blocks
  }
  return parseDocument(pagesToMarkdown(pages, layout), true)
}

// ---------------------------------------------------------------------------
// Words, search and redaction targets
// ---------------------------------------------------------------------------

export interface WordBox extends Rect {
  word: string
}

/** Splits runs into words with boxes estimated from character positions. */
export function wordBoxes(page: PageText): WordBox[] {
  const words: WordBox[] = []
  for (const run of page.runs) {
    const chars = run.str.length || 1
    const unit = run.w / chars
    for (const match of run.str.matchAll(/\S+/g)) {
      words.push({ word: match[0], x: run.x + match.index * unit, y: run.y, w: match[0].length * unit, h: run.h })
    }
  }
  return words
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Boxes over every occurrence of `query`, one per run it touches. */
export function findText(page: PageText, query: string, options: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean } = {}): Rect[] {
  const needle = query.trim()
  if (!needle) return []
  let pattern: RegExp
  try {
    const source = options.regex ? needle : escapeRegExp(needle).replace(/\s+/g, '\\s+')
    pattern = new RegExp(options.wholeWord ? `\\b(?:${source})\\b` : source, options.caseSensitive ? 'g' : 'gi')
  } catch {
    return []
  }
  const rects: Rect[] = []
  for (const line of groupLines(page.runs)) {
    // Character offsets of each run inside the joined line, so matches can span runs.
    let text = ''
    const spans: { run: TextRun; start: number; end: number }[] = []
    let end: number | null = null
    for (const run of line.runs) {
      if (end !== null && run.x - end > run.size * 0.18 && !text.endsWith(' ') && !run.str.startsWith(' ')) text += ' '
      spans.push({ run, start: text.length, end: text.length + run.str.length })
      text += run.str
      end = run.x + run.w
    }
    for (const match of text.matchAll(pattern)) {
      if (!match[0]) continue
      const from = match.index
      const to = from + match[0].length
      for (const span of spans) {
        const a = Math.max(from, span.start)
        const b = Math.min(to, span.end)
        if (a >= b) continue
        const unit = span.run.w / Math.max(1, span.run.str.length)
        rects.push({ x: span.run.x + (a - span.start) * unit, y: span.run.y, w: (b - a) * unit, h: span.run.h })
      }
    }
  }
  return rects
}

// ---------------------------------------------------------------------------
// Extractive summary
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set(
  'a an and are as at be been but by can could did do does for from had has have he her his i if in into is it its may more most no not of on or our she should so such than that the their them then there these they this those to was we were what when which who will with would you your also about after all any because before between both each few how just only other over same some very'.split(
    ' ',
  ),
)

export function splitSentences(text: string): string[] {
  return (
    text
      .replace(/\s+/g, ' ')
      .match(/[^.!?。！？]+(?:[.!?。！？]+["'”’)\]]*|$)/g)
      ?.map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 24 && /\p{L}/u.test(sentence)) ?? []
  )
}

/** Picks the sentences whose words are most frequent in the document, in reading order. */
export function extractiveSummary(text: string, count: number): string[] {
  const sentences = splitSentences(text)
  if (sentences.length <= count) return sentences
  const frequency = new Map<string, number>()
  const tokens = (sentence: string) => sentence.toLowerCase().match(/\p{L}[\p{L}\p{N}'-]+/gu)?.filter((word) => !STOP_WORDS.has(word) && word.length > 2) ?? []
  for (const sentence of sentences) for (const word of tokens(sentence)) frequency.set(word, (frequency.get(word) ?? 0) + 1)
  const scored = sentences.map((sentence, index) => {
    const words = tokens(sentence)
    const score = words.reduce((sum, word) => sum + (frequency.get(word) ?? 0), 0) / Math.max(4, words.length)
    // A small boost for opening sentences, which tend to state the topic.
    return { index, score: score * (index < 3 ? 1.25 : 1) }
  })
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map(({ index }) => sentences[index])
}

/** The most frequent meaningful words, for a keyword list. */
export function topKeywords(text: string, count: number): string[] {
  const frequency = new Map<string, number>()
  for (const word of text.toLowerCase().match(/\p{L}[\p{L}\p{N}'-]{3,}/gu) ?? []) {
    if (!STOP_WORDS.has(word)) frequency.set(word, (frequency.get(word) ?? 0) + 1)
  }
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word)
}
