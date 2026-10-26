import { diffArrays, diffChars, diffWordsWithSpace, type ChangeObject } from 'diff'

export type WhitespaceRule = 'exact' | 'trim' | 'all'
export type InlineGranularity = 'chars' | 'words'
export type EolKind = 'LF' | 'CRLF' | 'CR' | 'Mixed' | 'None'

/** What counts as an unimportant difference. Unimportant lines stay visible, tinted blue. */
export interface DiffRules {
  ignoreCase: boolean
  whitespace: WhitespaceRule
  ignoreBlankLines: boolean
}

export const DEFAULT_RULES: DiffRules = {
  ignoreCase: false,
  whitespace: 'trim',
  ignoreBlankLines: false,
}

/**
 * `same` identical, `minor` differs only by unimportant text, `changed` paired lines that differ,
 * `left` / `right` orphan lines that exist on one side only.
 */
export type RowKind = 'same' | 'minor' | 'changed' | 'left' | 'right'

export interface DiffRow {
  kind: RowKind
  left: number | null
  right: number | null
}

/** A contiguous block of differing rows. Line ranges are half-open and index into each side. */
export interface DiffSection {
  index: number
  startRow: number
  endRow: number
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
  important: boolean
}

export interface TextSide {
  lines: string[]
  eol: EolKind
  trailingNewline: boolean
}

export interface DiffStats {
  changed: number
  leftOnly: number
  rightOnly: number
  minor: number
  same: number
}

export type DiffVerdict = 'empty' | 'identical' | 'minor' | 'different'

export interface AlignedDiff {
  left: TextSide
  right: TextSide
  rows: DiffRow[]
  sections: DiffSection[]
  stats: DiffStats
  verdict: DiffVerdict
  /** True when the line matcher timed out and lines were paired by position. */
  approximate: boolean
}

export interface AlignOptions {
  rules: DiffRules
  ignoreMinor: boolean
}

const PAIR_THRESHOLD = 0.4
const MAX_ALIGN_CELLS = 40_000
const MATCH_TIMEOUT_MS = 1500
const SIMILARITY_SAMPLE = 400

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0
}

export function parseText(text: string): TextSide {
  const kinds: EolKind[] = []
  if (countMatches(text, /\r\n/g)) kinds.push('CRLF')
  if (countMatches(text, /(?<!\r)\n/g)) kinds.push('LF')
  if (countMatches(text, /\r(?!\n)/g)) kinds.push('CR')
  const eol: EolKind = kinds.length === 0 ? 'None' : kinds.length > 1 ? 'Mixed' : kinds[0]
  if (text === '') return { lines: [], eol, trailingNewline: false }
  const lines = text.split(/\r\n|\r|\n/)
  const trailingNewline = lines.length > 1 && lines[lines.length - 1] === ''
  if (trailingNewline) lines.pop()
  return { lines, eol, trailingNewline }
}

export function joinText(lines: readonly string[], side: Pick<TextSide, 'eol' | 'trailingNewline'>): string {
  if (lines.length === 0) return ''
  const separator = side.eol === 'CRLF' ? '\r\n' : side.eol === 'CR' ? '\r' : '\n'
  return lines.join(separator) + (side.trailingNewline ? separator : '')
}

export function normalizeLine(line: string, rules: DiffRules): string {
  let value = line
  if (rules.whitespace === 'trim') value = value.trim()
  else if (rules.whitespace === 'all') value = value.replace(/\s+/g, '')
  return rules.ignoreCase ? value.toLowerCase() : value
}

const isBlank = (line: string) => line.trim() === ''

/** Dice coefficient over character bigrams, 0 (unrelated) to 1 (equal). */
export function lineSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const x = a.replace(/\s+/g, ' ').trim().slice(0, SIMILARITY_SAMPLE)
  const y = b.replace(/\s+/g, ' ').trim().slice(0, SIMILARITY_SAMPLE)
  if (x === y) return 1
  if (x.length < 2 || y.length < 2) return 0
  const grams = new Map<string, number>()
  for (let i = 0; i < x.length - 1; i += 1) {
    const gram = x.slice(i, i + 2)
    grams.set(gram, (grams.get(gram) ?? 0) + 1)
  }
  let overlap = 0
  for (let i = 0; i < y.length - 1; i += 1) {
    const gram = y.slice(i, i + 2)
    const left = grams.get(gram)
    if (left) {
      overlap += 1
      grams.set(gram, left - 1)
    }
  }
  return (2 * overlap) / (x.length + y.length - 2)
}

type Pair = [number | null, number | null]

/** Pairs the removed and added lines of one hunk, preferring similar lines on the same row. */
function alignHunk(dels: number[], ins: number[], keysL: string[], keysR: string[]): Pair[] {
  const m = dels.length
  const n = ins.length
  if (m === 0) return ins.map((r) => [null, r])
  if (n === 0) return dels.map((l) => [l, null])

  const pairs: Pair[] = []
  if (m * n > MAX_ALIGN_CELLS) {
    for (let k = 0; k < Math.max(m, n); k += 1) pairs.push([dels[k] ?? null, ins[k] ?? null])
    return pairs
  }

  const sim = new Float64Array(m * n)
  const score = Array.from({ length: m + 1 }, () => new Float64Array(n + 1))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      const s = lineSimilarity(keysL[dels[i]], keysR[ins[j]])
      sim[i * n + j] = s
      let best = Math.max(score[i + 1][j], score[i][j + 1])
      if (s >= PAIR_THRESHOLD) best = Math.max(best, score[i + 1][j + 1] + s)
      score[i][j] = best
    }
  }

  let i = 0
  let j = 0
  while (i < m && j < n) {
    const s = sim[i * n + j]
    if (s >= PAIR_THRESHOLD && score[i][j] === score[i + 1][j + 1] + s) {
      pairs.push([dels[i], ins[j]])
      i += 1
      j += 1
    } else if (score[i][j] === score[i + 1][j]) {
      pairs.push([dels[i], null])
      i += 1
    } else {
      pairs.push([null, ins[j]])
      j += 1
    }
  }
  while (i < m) pairs.push([dels[i++], null])
  while (j < n) pairs.push([null, ins[j++]])
  return fillOrphanRuns(pairs)
}

/** Between matched anchors, sit leftover left and right lines side by side instead of staggering them. */
function fillOrphanRuns(pairs: Pair[]): Pair[] {
  const out: Pair[] = []
  let lefts: number[] = []
  let rights: number[] = []
  const flush = () => {
    for (let k = 0; k < Math.max(lefts.length, rights.length); k += 1) {
      out.push([lefts[k] ?? null, rights[k] ?? null])
    }
    lefts = []
    rights = []
  }
  for (const pair of pairs) {
    if (pair[0] !== null && pair[1] !== null) {
      flush()
      out.push(pair)
    } else if (pair[0] !== null) lefts.push(pair[0])
    else if (pair[1] !== null) rights.push(pair[1])
  }
  flush()
  return out
}

export function isDiffKind(kind: RowKind, ignoreMinor: boolean): boolean {
  return kind === 'changed' || kind === 'left' || kind === 'right' || (kind === 'minor' && !ignoreMinor)
}

export function alignDiff(leftText: string, rightText: string, { rules, ignoreMinor }: AlignOptions): AlignedDiff {
  const left = parseText(leftText)
  const right = parseText(rightText)
  const keysL = left.lines.map((line) => normalizeLine(line, rules))
  const keysR = right.lines.map((line) => normalizeLine(line, rules))

  let approximate = false
  let changes: ChangeObject<string[]>[] | undefined = diffArrays(keysL, keysR, { timeout: MATCH_TIMEOUT_MS })
  if (!changes) {
    approximate = true
    changes = [
      { value: keysL, count: keysL.length, removed: true, added: false },
      { value: keysR, count: keysR.length, removed: false, added: true },
    ]
  }

  const rows: DiffRow[] = []
  const classify = (l: number | null, r: number | null): DiffRow => {
    const lineL = l === null ? null : left.lines[l]
    const lineR = r === null ? null : right.lines[r]
    const blankOnly = rules.ignoreBlankLines && (lineL === null || isBlank(lineL)) && (lineR === null || isBlank(lineR))
    if (blankOnly) return { kind: 'minor', left: l, right: r }
    if (lineL === null) return { kind: 'right', left: l, right: r }
    if (lineR === null) return { kind: 'left', left: l, right: r }
    return { kind: 'changed', left: l, right: r }
  }

  let li = 0
  let ri = 0
  let dels: number[] = []
  let ins: number[] = []
  const flush = () => {
    if (dels.length === 0 && ins.length === 0) return
    for (const [l, r] of alignHunk(dels, ins, keysL, keysR)) rows.push(classify(l, r))
    dels = []
    ins = []
  }
  for (const change of changes) {
    const count = change.count ?? change.value.length
    if (change.removed) for (let k = 0; k < count; k += 1) dels.push(li++)
    else if (change.added) for (let k = 0; k < count; k += 1) ins.push(ri++)
    else {
      flush()
      for (let k = 0; k < count; k += 1) {
        rows.push({ kind: left.lines[li] === right.lines[ri] ? 'same' : 'minor', left: li, right: ri })
        li += 1
        ri += 1
      }
    }
  }
  flush()

  const sections: DiffSection[] = []
  const stats: DiffStats = { changed: 0, leftOnly: 0, rightOnly: 0, minor: 0, same: 0 }
  let current: DiffSection | null = null
  let leftPos = 0
  let rightPos = 0
  rows.forEach((row, index) => {
    if (row.kind === 'same') stats.same += 1
    else if (row.kind === 'minor') stats.minor += 1
    else if (row.kind === 'changed') stats.changed += 1
    else if (row.kind === 'left') stats.leftOnly += 1
    else stats.rightOnly += 1

    if (isDiffKind(row.kind, ignoreMinor)) {
      current ??= {
        index: sections.length,
        startRow: index,
        endRow: index,
        leftStart: leftPos,
        leftEnd: leftPos,
        rightStart: rightPos,
        rightEnd: rightPos,
        important: false,
      }
      current.endRow = index + 1
      if (row.left !== null) current.leftEnd = row.left + 1
      if (row.right !== null) current.rightEnd = row.right + 1
      if (row.kind !== 'minor') current.important = true
    } else if (current) {
      sections.push(current)
      current = null
    }
    if (row.left !== null) leftPos = row.left + 1
    if (row.right !== null) rightPos = row.right + 1
  })
  if (current) sections.push(current)

  const verdict: DiffVerdict =
    rows.length === 0
      ? 'empty'
      : stats.changed + stats.leftOnly + stats.rightOnly > 0
        ? 'different'
        : stats.minor > 0
          ? 'minor'
          : 'identical'

  return { left, right, rows, sections, stats, verdict, approximate }
}

/** Copies one section across, returning the full new text of the target side. */
export function applySection(diff: AlignedDiff, section: DiffSection, direction: 'toRight' | 'toLeft'): string {
  const { left, right } = diff
  if (direction === 'toRight') {
    const lines = [
      ...right.lines.slice(0, section.rightStart),
      ...left.lines.slice(section.leftStart, section.leftEnd),
      ...right.lines.slice(section.rightEnd),
    ]
    return joinText(lines, right.eol === 'None' ? left : right)
  }
  const lines = [
    ...left.lines.slice(0, section.leftStart),
    ...right.lines.slice(section.rightStart, section.rightEnd),
    ...left.lines.slice(section.leftEnd),
  ]
  return joinText(lines, left.eol === 'None' ? right : left)
}

export type ViewFilter = 'all' | 'diffs' | 'context' | 'same'

export type ViewItem = { type: 'row'; row: number } | { type: 'gap'; from: number; to: number }

/** Rows to render for a filter. Hidden runs collapse into gaps unless their start row is in `expanded`. */
export function buildView(
  rows: readonly DiffRow[],
  filter: ViewFilter,
  contextLines: number,
  ignoreMinor: boolean,
  expanded: ReadonlySet<number>,
): ViewItem[] {
  if (filter === 'all') return rows.map((_, row) => ({ type: 'row', row }))
  const visible = new Uint8Array(rows.length)
  rows.forEach((row, index) => {
    const diff = isDiffKind(row.kind, ignoreMinor)
    if (filter === 'same') {
      visible[index] = diff ? 0 : 1
    } else if (diff) {
      const reach = filter === 'context' ? contextLines : 0
      for (let k = Math.max(0, index - reach); k <= Math.min(rows.length - 1, index + reach); k += 1) {
        visible[k] = 1
      }
    }
  })
  const items: ViewItem[] = []
  let index = 0
  while (index < rows.length) {
    if (visible[index]) {
      items.push({ type: 'row', row: index })
      index += 1
      continue
    }
    let end = index
    while (end < rows.length && !visible[end]) end += 1
    if (expanded.has(index)) for (let k = index; k < end; k += 1) items.push({ type: 'row', row: k })
    else items.push({ type: 'gap', from: index, to: end })
    index = end
  }
  return items
}

export type SegmentKind = 'same' | 'diff' | 'minor'

export interface InlineSegment {
  text: string
  kind: SegmentKind
}

export interface InlineDiff {
  left: InlineSegment[]
  right: InlineSegment[]
  /** 1-based column of the first important difference on the left line, or null. */
  firstColumn: number | null
}

const MAX_INLINE_LENGTH = 4000
const MIN_SHARED_RATIO = 0.3

function pushSegment(list: InlineSegment[], text: string, kind: SegmentKind) {
  if (!text) return
  const last = list[list.length - 1]
  if (last && last.kind === kind) last.text += text
  else list.push({ text, kind })
}

function wholeLine(a: string, b: string, kind: SegmentKind): InlineDiff {
  return {
    left: a ? [{ text: a, kind }] : [],
    right: b ? [{ text: b, kind }] : [],
    firstColumn: kind === 'diff' ? 1 : null,
  }
}

/** Character- or word-level highlights for one pair of lines, with unimportant parts marked `minor`. */
export function inlineDiff(
  a: string,
  b: string,
  granularity: InlineGranularity,
  rules: DiffRules,
  minorLine = false,
): InlineDiff {
  if (a === b) return wholeLine(a, b, 'same')
  if (a.length + b.length > MAX_INLINE_LENGTH) return wholeLine(a, b, minorLine ? 'minor' : 'diff')

  const changes = granularity === 'chars' ? diffChars(a, b) : diffWordsWithSpace(a, b)
  const shared = changes.reduce((sum, change) => (change.added || change.removed ? sum : sum + change.value.length), 0)
  if (!minorLine && shared < Math.max(a.length, b.length) * MIN_SHARED_RATIO) return wholeLine(a, b, 'diff')

  const fold = (text: string) => {
    let value = rules.whitespace === 'exact' ? text : text.replace(/\s+/g, '')
    if (rules.ignoreCase) value = value.toLowerCase()
    return value
  }
  const left: InlineSegment[] = []
  const right: InlineSegment[] = []
  let firstColumn: number | null = null
  let column = 1
  for (let k = 0; k < changes.length; k += 1) {
    const change = changes[k]
    if (!change.added && !change.removed) {
      pushSegment(left, change.value, 'same')
      pushSegment(right, change.value, 'same')
      column += change.value.length
      continue
    }
    const next = changes[k + 1]
    const removed = change.removed ? change.value : ''
    const added = change.removed && next?.added ? next.value : change.added ? change.value : ''
    if (change.removed && next?.added) k += 1
    const kind: SegmentKind = minorLine || fold(removed) === fold(added) ? 'minor' : 'diff'
    if (kind === 'diff' && firstColumn === null) firstColumn = column
    pushSegment(left, removed, kind)
    pushSegment(right, added, kind)
    column += removed.length
  }
  return { left, right, firstColumn }
}

/** Longest line in display columns, with tabs expanded to `tabSize`. */
export function maxColumns(lines: readonly string[], tabSize = 4): number {
  let max = 0
  for (const line of lines) {
    let width = 0
    for (const char of line) width = char === '\t' ? width + tabSize - (width % tabSize) : width + 1
    if (width > max) max = width
  }
  return max
}
