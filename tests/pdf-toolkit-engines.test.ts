import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib'

import { DEFAULT_DOCUMENT_SETTINGS, type DocBlock } from '@/core/engines/files/document'
import { docToDocx } from '@/core/engines/files/docx'
import { htmlToBlocks } from '@/core/engines/files/htmlBlocks'
import { readDocx, readPptx, readXlsx } from '@/core/engines/files/office'
import { imagesToPptx } from '@/core/engines/files/pptx'
import { sheetsToXlsx } from '@/core/engines/files/xlsx'
import { addFormFields, cropPdf, rebuildPdf, removePages, rotatePages } from '@/core/engines/pdf/edit'
import { convertToPdfA } from '@/core/engines/pdf/pdfa'
import type { PageText, TextRun } from '@/core/engines/pdf/pdfjs'
import { compactTable, extractiveSummary, findText, groupLines, linesToTable, pagesToDocBlocks, pagesToMarkdown, topKeywords } from '@/core/engines/pdf/textLayout'

const PNG_1PX = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
)

/** A run whose width is 0.5 em per character, as pdf.js reports for proportional fonts. */
function run(str: string, x: number, y: number, size = 10, bold = false): TextRun {
  return { str, x, y, w: str.length * size * 0.5, h: size, size, bold, italic: false, eol: false }
}

function page(runs: TextRun[]): PageText {
  return { width: 612, height: 792, runs, links: [] }
}

async function samplePdf(pages = 3): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let index = 0; index < pages; index += 1) doc.addPage([600, 800]).drawText(`Page ${index + 1}`, { x: 40, y: 40, size: 12, font })
  return doc.save()
}

describe('text layout', () => {
  it('groups runs into lines by baseline and reads them left to right', () => {
    const lines = groupLines([run('world', 60, 100), run('Second line', 20, 120), run('Hello', 20, 100.5)])
    expect(lines.map((line) => line.text)).toEqual(['Hello world', 'Second line'])
  })

  it('snaps cells to shared columns and drops empty ones', () => {
    const lines = groupLines([
      run('Item', 20, 100), run('Qty', 200, 100), run('Price', 320, 100),
      run('Apples', 20, 115), run('3', 200, 115), run('1.20', 320, 115),
      run('Pears', 20, 130), run('1.80', 320, 130),
    ])
    expect(linesToTable(lines)).toEqual([
      ['Item', 'Qty', 'Price'],
      ['Apples', '3', '1.20'],
      ['Pears', '', '1.80'],
    ])
    expect(compactTable([['a', '', 'b'], ['c', '', 'd']])).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('rebuilds headings, lists and tables as Markdown', () => {
    const markdown = pagesToMarkdown(
      [
        page([
          run('Quarterly report', 20, 40, 22),
          run('Sales grew in every region this quarter.', 20, 80),
          run('• North up 12%', 20, 110),
          run('Region', 20, 140), run('Q1', 200, 140),
          run('North', 20, 155), run('12', 200, 155),
          run('South', 20, 170), run('9', 200, 170),
        ]),
      ],
      { headings: true, links: false, tables: true, pageBreaks: false },
    )
    expect(markdown).toContain('# Quarterly report')
    expect(markdown).toContain('Sales grew in every region this quarter.')
    expect(markdown).toContain('- North up 12%')
    expect(markdown).toContain('| Region | Q1 |\n| --- | --- |\n| North | 12 |\n| South | 9 |')
  })

  it('builds Word blocks with headings, lists and page labels', () => {
    const blocks = pagesToDocBlocks(
      [
        page([
          run('Quarterly report', 20, 40, 22),
          run('Sales grew in every region this quarter.', 20, 80),
          run('• North up 12%', 20, 110),
        ]),
      ],
      { headings: true, links: false, tables: false, pageBreaks: false, pageHeadings: true, pageNumbers: [3] },
    )
    expect(blocks.find((block) => block.type === 'heading')).toMatchObject({ level: 2, runs: [{ text: 'Page 3' }] })
    expect(blocks.some((block) => block.type === 'list')).toBe(true)
    const doc = readDocx(docToDocx(blocks, DEFAULT_DOCUMENT_SETTINGS))
    expect(doc.blocks.map((block) => ('runs' in block ? block.runs.map((part) => part.text).join('') : '')).join(' ')).toContain('Quarterly report')
  })

  it('finds text case-insensitively and by whole word', () => {
    const text = page([run('Invoice total: 42', 20, 100), run('Totally different', 20, 120)])
    expect(findText(text, 'total')).toHaveLength(2)
    const whole = findText(text, 'total', { wholeWord: true })
    expect(whole).toHaveLength(1)
    expect(whole[0]).toMatchObject({ x: 20 + 8 * 5, y: 100, w: 5 * 5 })
  })

  it('summarizes by sentence weight in reading order', () => {
    const text = [
      'Solar panels convert sunlight into electricity for homes.',
      'The weather was pleasant on the day of the visit.',
      'Modern solar panels reach higher electricity output than older panels.',
      'Lunch was served at noon in the main hall.',
      'Installing solar panels lowers electricity bills over time.',
    ].join(' ')
    const summary = extractiveSummary(text, 2)
    expect(summary).toHaveLength(2)
    expect(summary.every((sentence) => sentence.includes('solar') || sentence.includes('Solar'))).toBe(true)
    expect(text.indexOf(summary[0])).toBeLessThan(text.indexOf(summary[1]))
    expect(topKeywords(text, 2).sort()).toEqual(['panels', 'solar'])
  })
})

describe('office files', () => {
  it('writes a workbook with one sheet per page and reads it back', () => {
    const bytes = sheetsToXlsx([
      { name: 'Page 1', rows: [['Name', 'Total'], ['Ada', '42']] },
      { name: 'Page 1', rows: [['Only', 'row']], header: false },
    ])
    expect(readXlsx(bytes)).toEqual([
      { name: 'Page 1', rows: [['Name', 'Total'], ['Ada', '42']] },
      { name: 'Page 1 2', rows: [['Only', 'row']] },
    ])
  })

  it('writes one picture per slide and reads the deck back', () => {
    const bytes = imagesToPptx([
      { bytes: PNG_1PX, format: 'png', width: 720, height: 540 },
      { bytes: PNG_1PX, format: 'png', width: 720, height: 540 },
    ])
    const deck = readPptx(bytes)
    expect(deck.slides).toHaveLength(2)
    expect(deck.width / deck.height).toBeCloseTo(4 / 3, 2)
    for (const slide of deck.slides) expect(slide.shapes.some((shape) => shape.kind === 'image')).toBe(true)
  })

  it('reads headings, paragraphs and emphasis from a Word document', () => {
    const blocks: DocBlock[] = [
      { type: 'heading', level: 1, runs: [{ text: 'Minutes' }] },
      { type: 'paragraph', runs: [{ text: 'Agreed to ' }, { text: 'ship', bold: true }, { text: ' on Friday.' }] },
    ]
    const doc = readDocx(docToDocx(blocks, DEFAULT_DOCUMENT_SETTINGS))
    const text = doc.blocks.map((block) => ('runs' in block ? block.runs.map((part) => part.text).join('') : ''))
    expect(text).toContain('Minutes')
    expect(text).toContain('Agreed to ship on Friday.')
    expect(doc.blocks.find((block) => block.type === 'heading')).toMatchObject({ level: 1 })
  })

  it('reads the article of a web page without its navigation', () => {
    const page = htmlToBlocks(
      '<html><head><title>Guide</title></head><body><nav><a href="/">Home</a></nav><article><h1>Setup</h1><p>Install the <a href="/cli">CLI</a>.</p></article></body></html>',
      'https://example.com/docs/',
    )
    expect(page.title).toBe('Guide')
    const flat = JSON.stringify(page.blocks)
    expect(flat).toContain('Setup')
    expect(flat).toContain('https://example.com/cli')
    expect(flat).not.toContain('Home')
  })
})

describe('PDF page edits', () => {
  it('removes pages but refuses to remove every page', async () => {
    const bytes = await samplePdf(3)
    const trimmed = await PDFDocument.load(await removePages({ bytes }, [1, 1, 7]))
    expect(trimmed.getPageCount()).toBe(2)
    await expect(removePages({ bytes }, [0, 1, 2])).rejects.toThrow('at least one page')
  })

  it('adds quarter turns to chosen pages', async () => {
    const doc = await PDFDocument.load(await rotatePages({ bytes: await samplePdf(3) }, { 0: 1, 2: -1 }))
    expect(doc.getPages().map((item) => item.getRotation().angle)).toEqual([90, 0, 270])
  })

  it('crops only the pages that have a rectangle', async () => {
    const doc = await PDFDocument.load(await cropPdf({ bytes: await samplePdf(2) }, [{ u: 0.1, v: 0.25, w: 0.5, h: 0.5 }, null]))
    const [first, second] = doc.getPages()
    expect(first.getCropBox()).toEqual({ x: 60, y: 200, width: 300, height: 400 })
    expect(second.getCropBox()).toEqual({ x: 0, y: 0, width: 600, height: 800 })
  })

  it('adds fillable fields with unique names', async () => {
    const bytes = await addFormFields({ bytes: await samplePdf(1) }, [
      { type: 'text', name: 'Full name', page: 0, u: 0.1, v: 0.1, w: 0.4, h: 0.05 },
      { type: 'text', name: 'Full name', page: 0, u: 0.1, v: 0.2, w: 0.4, h: 0.05 },
      { type: 'checkbox', name: 'agree', page: 0, u: 0.1, v: 0.3, w: 0.03, h: 0.03, required: true },
      { type: 'dropdown', name: 'size', page: 0, u: 0.1, v: 0.4, w: 0.2, h: 0.04, options: ['S', ' M ', ''] },
      { type: 'text', name: 'ghost', page: 4, u: 0, v: 0, w: 0.1, h: 0.1 },
    ])
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getFields().map((field) => field.getName())).toEqual(['Full_name', 'Full_name_2', 'agree', 'size'])
    expect(form.getCheckBox('agree').isRequired()).toBe(true)
    expect(form.getDropdown('size').getOptions()).toEqual(['S', 'M'])
  })

  it('rebuilds a PDF whose cross-reference table is broken', async () => {
    const bytes = await samplePdf(2)
    const text = new TextDecoder('latin1').decode(bytes)
    const broken = new TextEncoder().encode(text.replace(/startxref\s+\d+/, 'startxref\n999999'))
    const rebuilt = await PDFDocument.load(await rebuildPdf(broken))
    expect(rebuilt.getPageCount()).toBe(2)
  })
})

describe('PDF/A', () => {
  it('identifies the file as PDF/A and reports fonts that are not embedded', async () => {
    const { bytes, report } = await convertToPdfA({ bytes: await samplePdf(1) }, 1)
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('<pdfaid:part>1</pdfaid:part>')
    expect(text).toContain('/OutputIntents')
    expect(text).toContain('/GTS_PDFA1')
    expect(report.unembeddedFonts).toEqual(['Helvetica'])
    expect(report.removedJavaScript).toBe(false)
  })
})
