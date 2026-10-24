export type Rgb = readonly [number, number, number]
export type PdfFont = 'helvetica' | 'times' | 'courier'
export type PdfFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic'

/** Coordinates are PostScript points from the top-left corner; text `y` is the baseline. */
export type PdfItem =
  | {
      kind: 'text'
      x: number
      y: number
      text: string
      font: PdfFont
      style: PdfFontStyle
      size: number
      color: Rgb
      width: number
    }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill?: Rgb; stroke?: Rgb; radius?: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: Rgb; width: number }
  | { kind: 'image'; x: number; y: number; w: number; h: number; src: string; format: 'PNG' | 'JPEG' }

export interface PdfPage {
  width: number
  height: number
  items: PdfItem[]
}

export interface PdfLayout {
  pages: PdfPage[]
  title: string
  /** Some characters fell outside the built-in fonts and were replaced. */
  lossyGlyphs: boolean
}

export const PDF_INK: Rgb = [15, 23, 42]
export const PDF_MUTED: Rgb = [100, 116, 139]
export const PDF_ACCENT: Rgb = [79, 70, 229]

const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

const REPLACEMENTS: Record<string, string> = {
  '\u00a0': ' ',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2009': ' ',
  '\u200b': '',
  '\ufeff': '',
  '\u2010': '-',
  '\u2011': '-',
  '\u2212': '-',
  '\u2192': '->',
  '\u2190': '<-',
  '\u2264': '<=',
  '\u2265': '>=',
  '\u2260': '!=',
  '\u2610': '[ ]',
  '\u2611': '[x]',
  '\u2612': '[x]',
  '\u2713': 'v',
  '\u2714': 'v',
  '\u25e6': '-',
  '\u25aa': '-',
}

/** The 14 built-in PDF fonts only cover Windows-1252; everything else becomes "?". */
export function toWinAnsi(text: string): { text: string; lossy: boolean } {
  let out = ''
  let lossy = false
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (char === '\t') out += '    '
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff) || WIN_ANSI_EXTRA.has(char)) {
      out += char
    } else if (char in REPLACEMENTS) out += REPLACEMENTS[char]
    else if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) continue
    else {
      out += '?'
      lossy = true
    }
  }
  return { text: out, lossy }
}

export interface Measurer {
  width: (text: string, font: PdfFont, style: PdfFontStyle, size: number) => number
}

/** Uses jsPDF's own font metrics so the preview wraps exactly like the file. */
export async function createMeasurer(): Promise<Measurer> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt' })
  const cache = new Map<string, number>()
  let current = ''
  return {
    width(text, font, style, size) {
      if (!text) return 0
      const key = `${font}|${style}|${text}`
      let unit = text.length <= 40 ? cache.get(key) : undefined
      if (unit === undefined) {
        const fontKey = `${font}|${style}`
        if (fontKey !== current) {
          doc.setFont(font, style)
          current = fontKey
        }
        unit = doc.getStringUnitWidth(text)
        if (text.length <= 40) cache.set(key, unit)
      }
      return unit * size
    },
  }
}

/** Longest prefix of `text` that fits, broken at a space when one is reasonably close. */
export function fitPrefix(text: string, maxWidth: number, measure: (value: string) => number): number {
  let lo = 1
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (measure(text.slice(0, mid)) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  const space = text.lastIndexOf(' ', lo)
  return space > lo * 0.5 && lo < text.length ? space + 1 : lo
}

export function truncateToWidth(text: string, maxWidth: number, measure: (value: string) => number): string {
  if (measure(text) <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (measure(`${text.slice(0, mid)}…`) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo === 0 ? '' : `${text.slice(0, lo).trimEnd()}…`
}

export async function renderPdf(layout: PdfLayout): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  let doc: InstanceType<typeof jsPDF> | null = null
  for (const page of layout.pages) {
    const orientation = page.width > page.height ? 'l' : 'p'
    if (doc) doc.addPage([page.width, page.height], orientation)
    else doc = new jsPDF({ unit: 'pt', format: [page.width, page.height], orientation, compress: true })
    for (const item of page.items) {
      switch (item.kind) {
        case 'text':
          doc.setFont(item.font, item.style)
          doc.setFontSize(item.size)
          doc.setTextColor(item.color[0], item.color[1], item.color[2])
          doc.text(item.text, item.x, item.y, { baseline: 'alphabetic' })
          break
        case 'rect': {
          if (item.fill) doc.setFillColor(item.fill[0], item.fill[1], item.fill[2])
          if (item.stroke) {
            doc.setDrawColor(item.stroke[0], item.stroke[1], item.stroke[2])
            doc.setLineWidth(0.6)
          }
          const style = item.fill && item.stroke ? 'FD' : item.fill ? 'F' : 'S'
          if (item.radius) doc.roundedRect(item.x, item.y, item.w, item.h, item.radius, item.radius, style)
          else doc.rect(item.x, item.y, item.w, item.h, style)
          break
        }
        case 'line':
          doc.setDrawColor(item.color[0], item.color[1], item.color[2])
          doc.setLineWidth(item.width)
          doc.line(item.x1, item.y1, item.x2, item.y2)
          break
        case 'image':
          doc.addImage(item.src, item.format, item.x, item.y, item.w, item.h, undefined, 'FAST')
          break
      }
    }
  }
  if (!doc) throw new Error('Nothing to render.')
  doc.setProperties({ title: layout.title, creator: 'One Panel' })
  return doc.output('blob')
}

export function addPageNumbers(pages: PdfPage[], measure: Measurer, bottomOffset: number): void {
  pages.forEach((page, index) => {
    const text = `${index + 1} / ${pages.length}`
    const size = 8.5
    const width = measure.width(text, 'helvetica', 'normal', size)
    page.items.push({
      kind: 'text',
      x: (page.width - width) / 2,
      y: page.height - bottomOffset,
      text,
      font: 'helvetica',
      style: 'normal',
      size,
      color: PDF_MUTED,
      width,
    })
  })
}
