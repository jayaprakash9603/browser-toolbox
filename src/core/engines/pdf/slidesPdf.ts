import { PDFDocument, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from '@cantoo/pdf-lib'

import type { Presentation, SlideParagraph } from '../files/office'
import { toWinAnsi } from '../files/pdfLayout'
import { hexToRgb } from './edit'

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}

function fontFor(fonts: Fonts, paragraph: SlideParagraph): PDFFont {
  if (paragraph.bold && paragraph.italic) return fonts.boldItalic
  if (paragraph.bold) return fonts.bold
  if (paragraph.italic) return fonts.italic
  return fonts.regular
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  for (const hardLine of text.split('\n')) {
    let line = ''
    for (const word of hardLine.split(/(\s+)/)) {
      const next = line + word
      if (line && font.widthOfTextAtSize(next.trimEnd(), size) > width) {
        lines.push(line.trimEnd())
        line = word.trimStart()
        // Break words that are wider than the box on their own.
        while (line && font.widthOfTextAtSize(line, size) > width) {
          let cut = line.length - 1
          while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut -= 1
          lines.push(line.slice(0, cut))
          line = line.slice(cut)
        }
      } else line = next
    }
    lines.push(line.trimEnd())
  }
  return lines
}

interface LaidLine {
  text: string
  font: PDFFont
  size: number
  color: string
  align: SlideParagraph['align']
  indent: number
  /** Extra space below, set on the last line of a paragraph. */
  after: number
}

function layoutParagraphs(paragraphs: SlideParagraph[], fonts: Fonts, width: number, scale: number): { lines: LaidLine[]; height: number } {
  const lines: LaidLine[] = []
  let height = 0
  for (const paragraph of paragraphs) {
    const size = paragraph.size * scale
    const font = fontFor(fonts, paragraph)
    const indent = paragraph.level * size * 1.2 + (paragraph.bullet ? size * 1.1 : 0)
    const text = toWinAnsi(paragraph.text).text
    const wrapped = text.trim() ? wrap(text, font, size, Math.max(10, width - indent)) : ['']
    wrapped.forEach((line, index) => {
      const bullet = index === 0 && paragraph.bullet
      lines.push({
        text: bullet ? `\u2022  ${line}` : line,
        font,
        size,
        color: paragraph.color,
        align: paragraph.align,
        indent: bullet ? indent - size * 1.1 : indent,
        after: index === wrapped.length - 1 ? size * 0.25 : 0,
      })
      height += size * 1.2
    })
    height += size * 0.25
  }
  return { lines, height }
}

/** Draws each slide on its own page; text that does not fit shrinks the way PowerPoint autofit does. */
export async function renderPresentation(presentation: Presentation, options: { notes?: boolean } = {}): Promise<{ bytes: Uint8Array; lossy: boolean }> {
  const doc = await PDFDocument.create()
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  }
  const images = new Map<Uint8Array, Promise<PDFImage>>()
  let lossy = false
  const { width, height } = presentation

  const notesPage = (page: PDFPage, text: string) => {
    const size = 11
    const lines = wrap(toWinAnsi(text).text, fonts.regular, size, width - 72)
    let y = height - 48
    for (const line of lines) {
      if (y < 36) break
      page.drawText(line, { x: 36, y, size, font: fonts.regular, color: hexToRgb('#1f2937') })
      y -= size * 1.35
    }
  }

  for (const slide of presentation.slides) {
    const page = doc.addPage([width, height])
    page.drawRectangle({ x: 0, y: 0, width, height, color: hexToRgb(slide.background ?? '#ffffff') })
    for (const shape of slide.shapes) {
      const bottom = height - shape.y - shape.h
      if (shape.kind === 'image') {
        let embedded = images.get(shape.bytes)
        if (!embedded) {
          embedded = shape.format === 'png' ? doc.embedPng(shape.bytes) : doc.embedJpg(shape.bytes)
          images.set(shape.bytes, embedded)
        }
        try {
          page.drawImage(await embedded, { x: shape.x, y: bottom, width: shape.w, height: shape.h })
        } catch {
          // A broken picture should not stop the rest of the deck.
        }
        continue
      }
      if (shape.fill || shape.line) {
        const style = {
          color: shape.fill ? hexToRgb(shape.fill) : undefined,
          borderColor: shape.line ? hexToRgb(shape.line) : undefined,
          borderWidth: shape.line ? 0.75 : 0,
        }
        if (shape.kind === 'box' && shape.ellipse) page.drawEllipse({ x: shape.x + shape.w / 2, y: bottom + shape.h / 2, xScale: shape.w / 2, yScale: shape.h / 2, ...style })
        else page.drawRectangle({ x: shape.x, y: bottom, width: shape.w, height: shape.h, ...style })
      }
      if (shape.kind !== 'text') continue
      if (shape.paragraphs.some((paragraph) => toWinAnsi(paragraph.text).lossy)) lossy = true

      const inset = 7.2
      const innerWidth = Math.max(10, shape.w - inset * 2)
      let scale = 1
      let laid = layoutParagraphs(shape.paragraphs, fonts, innerWidth, scale)
      while (laid.height > shape.h - inset && scale > 0.45) {
        scale -= 0.07
        laid = layoutParagraphs(shape.paragraphs, fonts, innerWidth, scale)
      }
      const free = shape.h - inset * 2 - laid.height
      let top = height - shape.y - inset - (shape.anchor === 'middle' ? Math.max(0, free / 2) : shape.anchor === 'bottom' ? Math.max(0, free) : 0)
      for (const line of laid.lines) {
        const baseline = top - line.size * 0.95
        if (line.text) {
          const textWidth = line.font.widthOfTextAtSize(line.text, line.size)
          const left = shape.x + inset + line.indent
          const x = line.align === 'center' ? shape.x + (shape.w - textWidth) / 2 : line.align === 'right' ? shape.x + shape.w - inset - textWidth : left
          page.drawText(line.text, { x, y: baseline, size: line.size, font: line.font, color: hexToRgb(line.color) })
        }
        top -= line.size * 1.2 + line.after
      }
    }
    if (options.notes && slide.notes) notesPage(doc.addPage([width, height]), slide.notes)
  }
  if (!presentation.slides.length) throw new Error('This presentation has no visible slides')
  return { bytes: await doc.save({ useObjectStreams: true }), lossy }
}
