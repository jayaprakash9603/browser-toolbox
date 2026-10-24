import { MARGINS_PT, PAGE_SIZES_PT, type MarginPreset, type PageSize } from './document'
import {
  PDF_INK,
  addPageNumbers,
  createMeasurer,
  toWinAnsi,
  truncateToWidth,
  type PdfLayout,
  type PdfPage,
  type Rgb,
} from './pdfLayout'

export interface TablePdfOptions {
  pageSize: PageSize
  margin: MarginPreset
  title: string
}

const HEADER_BG: Rgb = [238, 242, 255]
const HEADER_LINE: Rgb = [165, 180, 252]
const ZEBRA: Rgb = [248, 250, 252]
const GRID: Rgb = [226, 232, 240]
const NUMERIC = /^-?[\d,]*\.?\d+(?:[eE][+-]?\d+)?%?$/

export function isNumericColumn(rows: string[][], column: number): boolean {
  let seen = 0
  for (const row of rows) {
    const value = row[column]?.trim()
    if (!value) continue
    if (!NUMERIC.test(value)) return false
    seen += 1
    if (seen >= 50) break
  }
  return seen > 0
}

export async function layoutTablePdf(rows: string[][], options: TablePdfOptions): Promise<PdfLayout> {
  const measure = await createMeasurer()
  const [header = [], ...body] = rows
  const columns = Math.max(header.length, ...body.slice(0, 500).map((row) => row.length), 1)
  const landscape = columns > 6
  const [short, long] = PAGE_SIZES_PT[options.pageSize]
  const pageWidth = landscape ? long : short
  const pageHeight = landscape ? short : long
  const margin = Math.min(MARGINS_PT[options.margin], 54)
  const available = pageWidth - margin * 2
  const size = columns > 12 ? 7 : 8.5
  const pad = 4
  const rowHeight = size * 1.85
  const headerHeight = size * 2.2
  let lossy = false
  const clean = (value: string) => {
    const result = toWinAnsi(value.replace(/\s+/g, ' ').trim())
    if (result.lossy) lossy = true
    return result.text
  }

  const headers = Array.from({ length: columns }, (_, index) => clean(header[index] ?? '') || `Column ${index + 1}`)
  const numeric = headers.map((_, index) => isNumericColumn(body, index))
  const natural = headers.map((label, index) => {
    let widest = measure.width(label, 'helvetica', 'bold', size)
    for (const row of body.slice(0, 300)) {
      widest = Math.max(widest, measure.width(clean(row[index] ?? ''), 'helvetica', 'normal', size))
    }
    return Math.min(240, Math.max(28, widest + pad * 2))
  })
  const total = natural.reduce((sum, value) => sum + value, 0)
  const widths = natural.map((value) => (value / total) * available)

  const pages: PdfPage[] = []
  let page: PdfPage
  let y = 0
  const startPage = (first: boolean) => {
    page = { width: pageWidth, height: pageHeight, items: [] }
    pages.push(page)
    y = margin
    if (first && options.title.trim()) {
      const title = clean(options.title)
      page.items.push({
        kind: 'text',
        x: margin,
        y: y + 14,
        text: title,
        font: 'helvetica',
        style: 'bold',
        size: 15,
        color: PDF_INK,
        width: measure.width(title, 'helvetica', 'bold', 15),
      })
      y += 28
    }
    page.items.push({ kind: 'rect', x: margin, y, w: available, h: headerHeight, fill: HEADER_BG })
    drawRow(headers, headerHeight, 'bold')
    page.items.push({ kind: 'line', x1: margin, y1: y, x2: margin + available, y2: y, color: HEADER_LINE, width: 0.9 })
  }
  const drawRow = (cells: string[], height: number, style: 'bold' | 'normal') => {
    let x = margin
    const baseline = y + height / 2 + size * 0.34
    cells.forEach((cell, index) => {
      const width = widths[index]
      const text = truncateToWidth(cell, width - pad * 2, (value) => measure.width(value, 'helvetica', style, size))
      if (text) {
        const textWidth = measure.width(text, 'helvetica', style, size)
        page.items.push({
          kind: 'text',
          x: numeric[index] && style === 'normal' ? x + width - pad - textWidth : x + pad,
          y: baseline,
          text,
          font: 'helvetica',
          style,
          size,
          color: PDF_INK,
          width: textWidth,
        })
      }
      x += width
    })
    y += height
  }

  startPage(true)
  body.forEach((row, rowIndex) => {
    if (y + rowHeight > pageHeight - margin) startPage(false)
    if (rowIndex % 2 === 1) page.items.push({ kind: 'rect', x: margin, y, w: available, h: rowHeight, fill: ZEBRA })
    drawRow(Array.from({ length: columns }, (_, index) => clean(row[index] ?? '')), rowHeight, 'normal')
    page.items.push({ kind: 'line', x1: margin, y1: y, x2: margin + available, y2: y, color: GRID, width: 0.4 })
  })

  addPageNumbers(pages, measure, margin / 2)
  return { pages, title: options.title.trim() || 'Table', lossyGlyphs: lossy }
}
