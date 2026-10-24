import {
  listMarker,
  pageGeometry,
  type DocBlock,
  type DocumentSettings,
  type FontFamily,
  type InlineRun,
} from './document'
import {
  PDF_ACCENT,
  PDF_INK,
  PDF_MUTED,
  addPageNumbers,
  createMeasurer,
  fitPrefix,
  toWinAnsi,
  type Measurer,
  type PdfFont,
  type PdfFontStyle,
  type PdfLayout,
  type PdfPage,
  type Rgb,
} from './pdfLayout'

const FONTS: Record<FontFamily, PdfFont> = { sans: 'helvetica', serif: 'times', mono: 'courier' }
const LINK: Rgb = [67, 56, 202]
const CODE_BG: Rgb = [241, 245, 249]
const RULE: Rgb = [203, 213, 225]
const QUOTE_BAR: Rgb = [165, 180, 252]
const HEADING_SCALE = [1.75, 1.45, 1.25, 1.1, 1, 0.95]

interface Seg {
  text: string
  font: PdfFont
  style: PdfFontStyle
  size: number
  color: Rgb
  href?: string
  code?: boolean
  strike?: boolean
}

interface Placed extends Seg {
  x: number
  width: number
}

interface Line {
  segs: Placed[]
  /** Tallest glyph size on the line, used for spacing. */
  size: number
}

interface RunBase {
  font: PdfFont
  size: number
  color: Rgb
  bold?: boolean
  italic?: boolean
}

function fontStyle(bold?: boolean, italic?: boolean): PdfFontStyle {
  if (bold && italic) return 'bolditalic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

function sameSeg(a: Seg, b: Seg): boolean {
  return (
    a.font === b.font &&
    a.style === b.style &&
    a.size === b.size &&
    a.color === b.color &&
    a.href === b.href &&
    !!a.code === !!b.code &&
    !!a.strike === !!b.strike
  )
}

class TextComposer {
  readonly pages: PdfPage[] = []
  private page!: PdfPage
  lossy = false
  y = 0
  readonly left: number
  readonly width: number
  private readonly top: number
  private readonly bottom: number
  private readonly measure: Measurer
  private readonly pageWidth: number
  private readonly pageHeight: number

  constructor(measure: Measurer, pageWidth: number, pageHeight: number, margin: number) {
    this.measure = measure
    this.pageWidth = pageWidth
    this.pageHeight = pageHeight
    this.left = margin
    this.width = pageWidth - margin * 2
    this.top = margin
    this.bottom = pageHeight - margin
    this.newPage()
  }

  newPage() {
    this.page = { width: this.pageWidth, height: this.pageHeight, items: [] }
    this.pages.push(this.page)
    this.y = this.top
  }

  get atTop(): boolean {
    return this.y <= this.top + 0.5
  }

  ensure(height: number) {
    if (this.y + height > this.bottom && !this.atTop) this.newPage()
  }

  gap(amount: number) {
    if (!this.atTop) this.y = Math.min(this.y + amount, this.bottom)
  }

  clean(text: string): string {
    const result = toWinAnsi(text)
    if (result.lossy) this.lossy = true
    return result.text
  }

  segWidth(seg: Pick<Seg, 'text' | 'font' | 'style' | 'size'>): number {
    return this.measure.width(seg.text, seg.font, seg.style, seg.size)
  }

  /** Greedy word wrap that keeps bold, italic, code and link styling per word. */
  wrapRuns(runs: InlineRun[], maxWidth: number, base: RunBase): Line[] {
    const tokens: (Seg & { kind: 'word' | 'space' | 'break' })[] = []
    for (const run of runs) {
      const seg: Seg = {
        text: '',
        font: run.code ? 'courier' : base.font,
        style: fontStyle(base.bold || run.bold, base.italic || run.italic),
        size: run.code ? base.size * 0.92 : base.size,
        color: run.href ? LINK : base.color,
        href: run.href,
        code: run.code,
        strike: run.strike,
      }
      for (const part of this.clean(run.text.replace(/\r/g, '')).split(/(\n| +)/)) {
        if (!part) continue
        tokens.push({ ...seg, text: part, kind: part === '\n' ? 'break' : part.trim() ? 'word' : 'space' })
      }
    }

    const lines: Line[] = []
    let current: Placed[] = []
    let x = 0
    let pending: Seg | null = null
    const flush = () => {
      const merged: Placed[] = []
      for (const seg of current) {
        const last = merged[merged.length - 1]
        if (last && sameSeg(last, seg)) {
          last.text += seg.text
          last.width += seg.width
        } else merged.push({ ...seg })
      }
      lines.push({ segs: merged, size: Math.max(base.size, ...merged.map((seg) => seg.size)) })
      current = []
      x = 0
      pending = null
    }

    for (const token of tokens) {
      if (token.kind === 'break') {
        flush()
        continue
      }
      if (token.kind === 'space') {
        if (current.length) pending = { ...token, text: ' ' }
        continue
      }
      const width = this.segWidth(token)
      const spaceWidth = pending ? this.segWidth(pending) : 0
      if (current.length && x + spaceWidth + width > maxWidth) flush()
      else if (pending && current.length) {
        current.push({ ...pending, x, width: spaceWidth })
        x += spaceWidth
      }
      pending = null
      if (width <= maxWidth - x) {
        current.push({ ...token, x, width })
        x += width
        continue
      }
      let rest = token.text
      while (rest) {
        const take = fitPrefix(rest, Math.max(1, maxWidth - x), (value) => this.segWidth({ ...token, text: value }))
        const piece = rest.slice(0, Math.max(1, take))
        const pieceWidth = this.segWidth({ ...token, text: piece })
        current.push({ ...token, text: piece, x, width: pieceWidth })
        x += pieceWidth
        rest = rest.slice(piece.length)
        if (rest) flush()
      }
    }
    if (current.length || lines.length === 0) flush()
    return lines
  }

  /** Wraps a line while keeping its leading whitespace, for plain text and code. */
  wrapPreserving(text: string, maxWidth: number, font: PdfFont, style: PdfFontStyle, size: number): string[] {
    const measure = (value: string) => this.measure.width(value, font, style, size)
    let rest = this.clean(text)
    if (measure(rest) <= maxWidth) return [rest]
    const out: string[] = []
    while (rest && measure(rest) > maxWidth) {
      const cut = Math.max(1, fitPrefix(rest, maxWidth, measure))
      out.push(rest.slice(0, cut).trimEnd())
      rest = rest.slice(cut)
    }
    if (rest) out.push(rest)
    return out
  }

  drawLine(line: Line, x: number, leading: number) {
    this.ensure(leading)
    const baseline = this.y + (leading - line.size) / 2 + line.size * 0.8
    for (const seg of line.segs) {
      if (!seg.text) continue
      const left = x + seg.x
      if (seg.code && seg.text.trim()) {
        this.page.items.push({
          kind: 'rect',
          x: left - 1.5,
          y: baseline - seg.size * 0.82,
          w: seg.width + 3,
          h: seg.size * 1.08,
          fill: CODE_BG,
          radius: 1.5,
        })
      }
      this.page.items.push({
        kind: 'text',
        x: left,
        y: baseline,
        text: seg.text,
        font: seg.font,
        style: seg.style,
        size: seg.size,
        color: seg.color,
        width: seg.width,
      })
      if (seg.href || seg.strike) {
        const y = seg.strike ? baseline - seg.size * 0.3 : baseline + seg.size * 0.12
        this.page.items.push({ kind: 'line', x1: left, y1: y, x2: left + seg.width, y2: y, color: seg.color, width: 0.5 })
      }
    }
    this.y += leading
  }

  text(text: string, x: number, leading: number, font: PdfFont, style: PdfFontStyle, size: number, color: Rgb) {
    this.drawLine(
      { segs: [{ text, font, style, size, color, x: 0, width: this.measure.width(text, font, style, size) }], size },
      x,
      leading,
    )
  }

  rect(x: number, width: number, height: number, fill: Rgb) {
    this.page.items.push({ kind: 'rect', x, y: this.y, w: width, h: height, fill })
  }

  rule(color: Rgb, thickness: number) {
    this.page.items.push({
      kind: 'line',
      x1: this.left,
      y1: this.y,
      x2: this.left + this.width,
      y2: this.y,
      color,
      width: thickness,
    })
  }

  textAt(text: string, x: number, baseline: number, font: PdfFont, size: number, color: Rgb) {
    this.page.items.push({
      kind: 'text',
      x,
      y: baseline,
      text,
      font,
      style: 'normal',
      size,
      color,
      width: this.measure.width(text, font, 'normal', size),
    })
  }
}

export async function layoutTextDocument(blocks: DocBlock[], settings: DocumentSettings): Promise<PdfLayout> {
  const measure = await createMeasurer()
  const { width, height, margin } = pageGeometry(settings)
  const c = new TextComposer(measure, width, height, margin)
  const font = FONTS[settings.font]
  const size = settings.fontSize
  const leading = size * settings.lineHeight

  const title = settings.title.trim()
  if (title) {
    const titleSize = size * 1.9
    for (const line of c.wrapRuns([{ text: title }], c.width, { font, size: titleSize, color: PDF_INK, bold: true })) {
      c.drawLine(line, c.left, titleSize * 1.2)
    }
    c.y += 4
    c.rule(PDF_ACCENT, 1.5)
    c.y += size * 1.2
  }

  const lineBlocks = blocks.filter((block) => block.type === 'line').length
  const gutter = settings.lineNumbers && lineBlocks
    ? measure.width('0'.repeat(String(lineBlocks).length), font, 'normal', size * 0.85) + 12
    : 0
  let lineNumber = 0

  blocks.forEach((block, index) => {
    const next = blocks[index + 1]
    switch (block.type) {
      case 'line': {
        lineNumber += 1
        const parts = block.text
          ? c.wrapPreserving(block.text, c.width - gutter, font, 'normal', size)
          : ['']
        parts.forEach((part, partIndex) => {
          c.ensure(leading)
          if (gutter && partIndex === 0) {
            const label = String(lineNumber)
            const labelSize = size * 0.85
            const labelWidth = measure.width(label, font, 'normal', labelSize)
            const baseline = c.y + (leading - size) / 2 + size * 0.8
            c.textAt(label, c.left + gutter - 12 - labelWidth, baseline, font, labelSize, PDF_MUTED)
          }
          if (part) c.text(part, c.left + gutter, leading, font, 'normal', size, PDF_INK)
          else c.y += leading
        })
        break
      }
      case 'heading': {
        const headingSize = size * (HEADING_SCALE[block.level - 1] ?? 1)
        const headingLeading = headingSize * 1.25
        c.gap(headingSize * 0.75)
        c.ensure(headingLeading + leading * 2)
        for (const line of c.wrapRuns(block.runs, c.width, { font, size: headingSize, color: PDF_INK, bold: true })) {
          c.drawLine(line, c.left, headingLeading)
        }
        c.y += headingSize * 0.25
        break
      }
      case 'paragraph':
        for (const line of c.wrapRuns(block.runs, c.width, { font, size, color: PDF_INK })) c.drawLine(line, c.left, leading)
        c.y += size * 0.6
        break
      case 'list': {
        const indent = 18 * (block.depth + 1)
        const marker = c.clean(listMarker(block))
        const lines = c.wrapRuns(block.runs, c.width - indent, { font, size, color: PDF_INK })
        lines.forEach((line, lineIndex) => {
          c.ensure(leading)
          if (lineIndex === 0) {
            const markerWidth = measure.width(marker, font, 'normal', size)
            const baseline = c.y + (leading - size) / 2 + size * 0.8
            c.textAt(marker, c.left + indent - 6 - markerWidth, baseline, font, size, block.ordered ? PDF_INK : PDF_ACCENT)
          }
          c.drawLine(line, c.left + indent, leading)
        })
        c.y += next?.type === 'list' && next.listId === block.listId ? size * 0.15 : size * 0.6
        break
      }
      case 'quote':
        for (const line of c.wrapRuns(block.runs, c.width - 16, { font, size, color: PDF_MUTED, italic: true })) {
          c.ensure(leading)
          c.rect(c.left, 2.5, leading, QUOTE_BAR)
          c.drawLine(line, c.left + 14, leading)
        }
        c.y += size * 0.6
        break
      case 'code': {
        const codeSize = size * 0.88
        const codeLeading = codeSize * 1.45
        c.gap(2)
        for (const raw of block.text.split('\n')) {
          for (const part of raw ? c.wrapPreserving(raw, c.width - 16, 'courier', 'normal', codeSize) : ['']) {
            c.ensure(codeLeading)
            c.rect(c.left, c.width, codeLeading, CODE_BG)
            if (part) c.text(part, c.left + 8, codeLeading, 'courier', 'normal', codeSize, PDF_INK)
            else c.y += codeLeading
          }
        }
        c.y += size * 0.7
        break
      }
      case 'rule':
        c.ensure(size * 1.6)
        c.y += size * 0.8
        c.rule(RULE, 0.8)
        c.y += size * 0.8
        break
    }
  })

  if (settings.pageNumbers) addPageNumbers(c.pages, measure, margin / 2)
  return { pages: c.pages, title: title || 'Document', lossyGlyphs: c.lossy }
}
