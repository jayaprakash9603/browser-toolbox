import { describe, expect, it } from 'vitest'
import { PDFArray, PDFDocument, PDFName, PDFRawStream, StandardFonts, degrees } from '@cantoo/pdf-lib'
import { unzlibSync } from 'fflate'

import {
  assemblePdf,
  editPdf,
  isPdfEncrypted,
  loadPdf,
  optimizePdf,
  protectPdf,
  readMetadata,
  readPdfFormFields,
  splitPdf,
  stampPdf,
  unlockPdf,
  updatePdfMetadata,
} from '@/core/engines/pdf/edit'
import { displaySize, localToPdf, normalizeRotation, numberAnchor, toPdfPoint, watermarkAnchors, type PageBox } from '@/core/engines/pdf/geometry'
import { describePages, parsePageRanges, parsePageSelection, splitEvery } from '@/core/engines/pdf/ranges'

const PNG_1PX = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
)

async function samplePdf(sizes: [number, number][] = [[200, 300], [300, 400], [400, 500]]) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  sizes.forEach(([width, height], index) => {
    const page = doc.addPage([width, height])
    page.drawText(`Page ${index + 1}`, { x: 20, y: 20, size: 12, font })
  })
  doc.setTitle('Sample report')
  doc.setAuthor('Ada')
  return doc.save()
}

function hex(text: string) {
  return [...text].map((char) => char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join('')
}

async function pageContent(bytes: Uint8Array, index: number, password?: string) {
  const doc = await PDFDocument.load(bytes, { password })
  const contents = doc.getPage(index).node.Contents()
  const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => doc.context.lookup(ref)) : [contents]
  return streams
    .map((stream) => {
      if (!(stream instanceof PDFRawStream)) return ''
      const raw = stream.getContents()
      const filter = stream.dict.get(PDFName.of('Filter'))
      return new TextDecoder('latin1').decode(filter ? unzlibSync(raw) : raw)
    })
    .join('\n')
}

describe('page ranges', () => {
  it('parses ranges, open ends and reverse runs into zero-based groups', () => {
    expect(parsePageRanges('1-3, 5, 8-', 9)).toEqual({ ok: true, groups: [[0, 1, 2], [4], [7, 8]] })
    expect(parsePageRanges('-2 ; 4 – 3', 5)).toEqual({ ok: true, groups: [[0, 1], [3, 2]] })
    expect(parsePageRanges('', 5)).toEqual({ ok: false, issue: { kind: 'empty' } })
    expect(parsePageRanges('2-x', 5)).toEqual({ ok: false, issue: { kind: 'syntax', token: '2-x' } })
    expect(parsePageRanges('4-7', 5)).toEqual({ ok: false, issue: { kind: 'outOfRange', token: '4-7', total: 5 } })
    expect(parsePageSelection('3, 1-3', 5)).toEqual({ ok: true, groups: [[2, 0, 1]] })
  })

  it('chunks documents and labels page runs', () => {
    expect(splitEvery(7, 3)).toEqual([[0, 1, 2], [3, 4, 5], [6]])
    expect(describePages([0, 1, 2, 4, 6, 7])).toBe('1-3, 5, 7-8')
  })
})

describe('page geometry', () => {
  const box = (rotation: number): PageBox => ({ x: 10, y: 20, width: 200, height: 100, rotation: normalizeRotation(rotation) })

  it('maps the displayed top-left corner to the right PDF corner for every rotation', () => {
    expect(toPdfPoint(box(0), 0, 0)).toEqual({ x: 10, y: 120 })
    expect(toPdfPoint(box(90), 0, 0)).toEqual({ x: 10, y: 20 })
    expect(toPdfPoint(box(180), 0, 0)).toEqual({ x: 210, y: 20 })
    expect(toPdfPoint(box(270), 0, 0)).toEqual({ x: 210, y: 120 })
    expect(toPdfPoint(box(90), 1, 1)).toEqual({ x: 210, y: 120 })
    expect(displaySize(box(-90))).toEqual({ width: 100, height: 200 })
    expect(localToPdf(box(0), 0, 0)).toEqual({ x: 10, y: 20 })
  })

  it('places page numbers and watermarks inside the displayed page', () => {
    const display = { width: 600, height: 800 }
    expect(numberAnchor(display, 40, 10, 'bottom-center', 30)).toEqual({ x: 280, y: 30 })
    expect(numberAnchor(display, 40, 10, 'top-right', 30).x).toBe(530)
    const [center] = watermarkAnchors(display, 200, 50, 0, 'center')
    expect(center).toEqual({ x: 200, y: 375 })
    expect(watermarkAnchors(display, 200, 50, 45, 'tile').length).toBeGreaterThan(4)
  })
})

describe('assembling PDFs', () => {
  it('reorders, rotates, duplicates and inserts blank and image pages', async () => {
    const first = await samplePdf()
    const second = await samplePdf([[612, 792]])
    const bytes = await assemblePdf(
      [{ bytes: first }, { bytes: second }],
      [
        { kind: 'page', source: 0, index: 2, rotate: 90 },
        { kind: 'blank', width: 100, height: 150 },
        { kind: 'page', source: 0, index: 0 },
        { kind: 'page', source: 0, index: 0, rotate: -90 },
        { kind: 'page', source: 1, index: 0 },
        { kind: 'image', bytes: PNG_1PX, format: 'png', width: 50, height: 50 },
      ],
      { metadataFrom: 0 },
    )
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(6)
    expect(doc.getPages().map((page) => [Math.round(page.getWidth()), page.getRotation().angle])).toEqual([
      [400, 90],
      [100, 0],
      [200, 0],
      [200, 270],
      [612, 0],
      [50, 0],
    ])
    expect(readMetadata(doc).title).toBe('Sample report')
    expect(await pageContent(bytes, 3)).toContain(hex('Page 1'))
  })

  it('splits into one file per group', async () => {
    const parts = await splitPdf({ bytes: await samplePdf() }, [[0, 1], [2]])
    const counts = await Promise.all(parts.map(async (part) => (await PDFDocument.load(part)).getPageCount()))
    expect(counts).toEqual([2, 1])
  })

  it('re-saves losslessly without losing pages', async () => {
    const optimized = await optimizePdf({ bytes: await samplePdf() })
    expect((await PDFDocument.load(optimized)).getPageCount()).toBe(3)
  })
})

describe('stamping', () => {
  it('numbers the chosen pages and keeps labels upright on rotated pages', async () => {
    const source = await PDFDocument.load(await samplePdf())
    source.getPage(1).setRotation(degrees(90))
    const bytes = await stampPdf(
      { bytes: await source.save() },
      {
        pages: [1, 2],
        pageNumbers: { template: 'Page {n} of {total}', position: 'bottom-center', start: 1, fontSize: 10, margin: 24, color: '#333333' },
        watermark: { text: 'DRAFT', fontSize: 48, color: '#ff0000', opacity: 0.2, angle: 45, layout: 'center' },
      },
    )
    const rotated = await pageContent(bytes, 1)
    expect(rotated).toContain(hex('Page 1 of 2'))
    // Rotated 90° so the label reads upright, 24pt above the displayed bottom edge (x = 300).
    expect(rotated).toMatch(/\S+ 1 -1 \S+ 276 [\d.]+ Tm/)
    expect(rotated).toContain(hex('DRAFT'))
    expect(await pageContent(bytes, 2)).toContain(hex('Page 2 of 2'))
    expect(await pageContent(bytes, 0)).not.toContain(hex('Page 1 of'))
  })
})

describe('editing', () => {
  it('draws text, cover boxes, check marks and images where they were placed', async () => {
    const bytes = await editPdf(
      { bytes: await samplePdf() },
      {
        items: [
          { kind: 'text', page: 0, u: 0.1, v: 0.1, text: 'Approved\nby Ada', fontSize: 12, font: 'helvetica', color: '#112233' },
          { kind: 'rect', page: 0, u: 0.5, v: 0.5, w: 0.2, h: 0.1, color: '#ffffff', opacity: 1 },
          { kind: 'check', page: 1, u: 0.2, v: 0.2, w: 0.05, h: 0.05, color: '#000000' },
          { kind: 'image', page: 2, u: 0.5, v: 0.8, w: 0.3, h: 0.1, bytes: PNG_1PX, format: 'png' },
        ],
      },
    )
    const first = await pageContent(bytes, 0)
    expect(first).toContain(hex('Approved'))
    expect(first).toContain(hex('by Ada'))
    // Text starts 10% from the left (20pt) on a 200×300 page.
    expect(first).toMatch(/1 0 0 1 20 258\.\d+ Tm/)
    // Cover box from (100, 150) to (140, 120) in PDF space, written with a flipped y axis.
    expect(first).toMatch(/100 -150 m\s+140 -150 l\s+140 -120 l\s+100 -120 l/)
    expect(await pageContent(bytes, 1)).toMatch(/ l\b/)
    expect(await pageContent(bytes, 2)).toMatch(/\/Image-?\w+ Do|Do\b/)
  })

  it('maps boxes on rotated pages to the displayed position', async () => {
    const source = await PDFDocument.load(await samplePdf([[200, 300]]))
    source.getPage(0).setRotation(degrees(90))
    const bytes = await editPdf(
      { bytes: await source.save() },
      { items: [{ kind: 'rect', page: 0, u: 0, v: 0, w: 0.5, h: 0.5, color: '#ffff00', opacity: 0.4 }] },
    )
    // The displayed top-left quarter of a 90° page is the PDF's bottom-left corner region.
    expect(await pageContent(bytes, 0)).toMatch(/0 0 m\s+0 -150 l\s+100 -150 l\s+100 0 l/)
  })

  it('fills and flattens form fields', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([400, 400])
    const form = doc.getForm()
    form.createTextField('name').addToPage(page, { x: 20, y: 300, width: 200, height: 24 })
    form.createCheckBox('agree').addToPage(page, { x: 20, y: 250, width: 16, height: 16 })
    const dropdown = form.createDropdown('plan')
    dropdown.addOptions(['Free', 'Pro'])
    dropdown.addToPage(page, { x: 20, y: 200, width: 120, height: 24 })
    const source = await doc.save()

    expect((await readPdfFormFields({ bytes: source })).map((field) => [field.name, field.type])).toEqual([
      ['name', 'text'],
      ['agree', 'checkbox'],
      ['plan', 'dropdown'],
    ])

    const filled = await editPdf({ bytes: source }, { items: [], form: { values: { name: 'Ada', agree: true, plan: 'Pro' }, flatten: false } })
    const fields = await readPdfFormFields({ bytes: filled })
    expect(fields.map((field) => field.value)).toEqual(['Ada', true, 'Pro'])

    const flat = await editPdf({ bytes: source }, { items: [], form: { values: { name: 'Ada' }, flatten: true } })
    expect(await readPdfFormFields({ bytes: flat })).toEqual([])
  })
})

describe('properties and security', () => {
  it('updates and strips document properties', async () => {
    const source = { bytes: await samplePdf() }
    const updated = await updatePdfMetadata(source, { title: 'Q3', author: 'Grace', subject: 'Plan', keywords: 'a, b' })
    expect(readMetadata(await PDFDocument.load(updated))).toMatchObject({ title: 'Q3', author: 'Grace', subject: 'Plan', keywords: 'a b' })
    const stripped = await updatePdfMetadata(source, { title: '', author: '', subject: '', keywords: '' }, true)
    expect(readMetadata(await PDFDocument.load(stripped, { updateMetadata: false }))).toMatchObject({ title: '', author: '', producer: '' })
  })

  it('protects with a password and unlocks again', async () => {
    const locked = await protectPdf(
      { bytes: await samplePdf() },
      { userPassword: 'open-sesame', allowPrinting: true, allowCopying: false, allowEditing: false },
    )
    expect(await isPdfEncrypted(locked)).toBe(true)
    await expect(loadPdf({ bytes: locked })).rejects.toThrow()
    expect((await loadPdf({ bytes: locked, password: 'open-sesame' })).getPageCount()).toBe(3)
    expect(await pageContent(locked, 0, 'open-sesame')).toContain(hex('Page 1'))

    const unlocked = await unlockPdf({ bytes: locked, password: 'open-sesame' })
    expect(await isPdfEncrypted(unlocked)).toBe(false)
    expect(await pageContent(unlocked, 0)).toContain(hex('Page 1'))
  })
})
