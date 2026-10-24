import {
  EncryptedPDFError,
  LineCapStyle,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from '@cantoo/pdf-lib'

import {
  arrowBarbs,
  displaySize,
  ellipseCurves,
  lineEnds,
  localToPdf,
  normalizeRotation,
  numberAnchor,
  pageNumberLabel,
  toPdfPoint,
  watermarkAnchors,
  type LineDirection,
  type NumberPosition,
  type PageBox,
  type Point,
} from './geometry'

export interface PdfSource {
  bytes: Uint8Array
  password?: string
}

export type FontKey = 'helvetica' | 'times' | 'courier'

/** Text drawn as a PNG because the built-in PDF fonts cannot encode it. Sizes are in points. */
export interface RasterText {
  bytes: Uint8Array
  width: number
  height: number
}

const FONTS: Record<FontKey, { regular: StandardFonts; bold: StandardFonts }> = {
  helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
  courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold },
}

/** Baseline of the first line below the top of a text box, matching CSS `line-height: 1.2`. */
export const TEXT_ASCENT = 0.947
export const TEXT_LINE_HEIGHT = 1.2

export function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((char) => char + char).join('') : value.padEnd(6, '0')
  const channel = (offset: number) => parseInt(full.slice(offset, offset + 2), 16) / 255
  return rgb(channel(0), channel(2), channel(4))
}

export async function loadPdf(source: PdfSource): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(source.bytes, { password: source.password, updateMetadata: false })
  } catch (error) {
    // Files with only an owner password open with an empty user password.
    if (source.password === undefined && error instanceof EncryptedPDFError) {
      return PDFDocument.load(source.bytes, { password: '', updateMetadata: false })
    }
    throw error
  }
}

async function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  doc.setModificationDate(new Date())
  return doc.save({ useObjectStreams: true })
}

export function pageBox(page: PDFPage): PageBox {
  const { x, y, width, height } = page.getCropBox()
  return { x, y, width, height, rotation: normalizeRotation(page.getRotation().angle) }
}

class FontCache {
  private readonly doc: PDFDocument
  private readonly fonts = new Map<string, Promise<PDFFont>>()

  constructor(doc: PDFDocument) {
    this.doc = doc
  }

  get(font: FontKey = 'helvetica', bold = false): Promise<PDFFont> {
    const name = FONTS[font][bold ? 'bold' : 'regular']
    let cached = this.fonts.get(name)
    if (!cached) {
      cached = this.doc.embedFont(name)
      this.fonts.set(name, cached)
    }
    return cached
  }
}

function embedImage(doc: PDFDocument, bytes: Uint8Array, format: 'png' | 'jpg'): Promise<PDFImage> {
  return format === 'png' ? doc.embedPng(bytes) : doc.embedJpg(bytes)
}

// ---------------------------------------------------------------------------
// Assembling: merge, organize, split, extract
// ---------------------------------------------------------------------------

export type PageSpec =
  | { kind: 'page'; source: number; index: number; /** Extra clockwise degrees, a multiple of 90. */ rotate?: number }
  | { kind: 'blank'; width: number; height: number }
  | { kind: 'image'; bytes: Uint8Array; format: 'png' | 'jpg'; width: number; height: number }

export interface AssembleOptions {
  /** Copy title, author, subject and keywords from this source. */
  metadataFrom?: number
  title?: string
}

async function assembleLoaded(docs: PDFDocument[], pages: PageSpec[], options: AssembleOptions = {}): Promise<PDFDocument> {
  const out = await PDFDocument.create({ updateMetadata: false })

  // Copy each source in batches so shared fonts and images are written once.
  const copies = new Map<string, PDFPage[]>()
  const wanted = new Map<number, number[][]>()
  for (const spec of pages) {
    if (spec.kind !== 'page') continue
    const batches = wanted.get(spec.source) ?? []
    const batch = batches.find((indices) => !indices.includes(spec.index))
    if (batch) batch.push(spec.index)
    else batches.push([spec.index])
    wanted.set(spec.source, batches)
  }
  for (const [source, batches] of wanted) {
    const doc = docs[source]
    if (!doc) throw new Error(`Missing source document ${source + 1}`)
    for (const indices of batches) {
      const copied = await out.copyPages(doc, indices)
      indices.forEach((index, position) => {
        const key = `${source}:${index}`
        copies.set(key, [...(copies.get(key) ?? []), copied[position]])
      })
    }
  }

  for (const spec of pages) {
    if (spec.kind === 'page') {
      const page = copies.get(`${spec.source}:${spec.index}`)?.shift()
      if (!page) throw new Error(`Page ${spec.index + 1} is missing from source ${spec.source + 1}`)
      out.addPage(page)
      if (spec.rotate) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + spec.rotate)))
    } else if (spec.kind === 'blank') {
      out.addPage([spec.width, spec.height])
    } else {
      const image = await embedImage(out, spec.bytes, spec.format)
      const page = out.addPage([spec.width, spec.height])
      page.drawImage(image, { x: 0, y: 0, width: spec.width, height: spec.height })
    }
  }

  const meta = options.metadataFrom !== undefined ? docs[options.metadataFrom] : undefined
  if (meta) {
    const { title, author, subject, keywords } = readMetadata(meta)
    if (title) out.setTitle(title)
    if (author) out.setAuthor(author)
    if (subject) out.setSubject(subject)
    if (keywords) out.setKeywords(keywords.split(/\s*[,;]\s*/).filter(Boolean))
  }
  if (options.title) out.setTitle(options.title)
  out.setCreationDate(new Date())
  return out
}

/** Builds a new PDF from pages of one or more sources, blank pages and images, in the given order. */
export async function assemblePdf(sources: PdfSource[], pages: PageSpec[], options: AssembleOptions = {}): Promise<Uint8Array> {
  const docs = await Promise.all(sources.map(loadPdf))
  return savePdf(await assembleLoaded(docs, pages, options))
}

/** One output file per group of zero-based page indices. */
export async function splitPdf(source: PdfSource, groups: number[][]): Promise<Uint8Array[]> {
  const doc = await loadPdf(source)
  const results: Uint8Array[] = []
  for (const group of groups) {
    const pages: PageSpec[] = group.map((index) => ({ kind: 'page', source: 0, index }))
    results.push(await savePdf(await assembleLoaded([doc], pages, { metadataFrom: 0 })))
  }
  return results
}

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/**
 * Lossless re-save: object streams plus a rebuild that drops unreachable objects.
 * Documents with forms or bookmarks are re-saved in place so those survive.
 */
export async function optimizePdf(source: PdfSource): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  const inPlace = await doc.save({ useObjectStreams: true })
  const interactive = doc.catalog.has(PDFName.of('AcroForm')) || doc.catalog.has(PDFName.of('Outlines'))
  if (interactive) return inPlace
  const pages: PageSpec[] = doc.getPageIndices().map((index) => ({ kind: 'page', source: 0, index }))
  const rebuilt = await (await assembleLoaded([doc], pages, { metadataFrom: 0 })).save({ useObjectStreams: true })
  return rebuilt.length < inPlace.length ? rebuilt : inPlace
}

// ---------------------------------------------------------------------------
// Watermarks and page numbers
// ---------------------------------------------------------------------------

export interface WatermarkSpec {
  text: string
  /** Pre-rendered label for text the standard fonts cannot encode. */
  image?: RasterText
  fontSize: number
  color: string
  opacity: number
  /** Counter-clockwise degrees on the displayed page. */
  angle: number
  layout: 'center' | 'tile'
  bold?: boolean
}

export interface PageNumberSpec {
  /** "{n}" and "{total}" are replaced, e.g. "Page {n} of {total}". */
  template: string
  position: NumberPosition
  start: number
  fontSize: number
  margin: number
  color: string
}

export interface StampOptions {
  watermark?: WatermarkSpec
  pageNumbers?: PageNumberSpec
  /** Zero-based pages to stamp; all pages when omitted. */
  pages?: number[]
}

export async function stampPdf(source: PdfSource, options: StampOptions): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  const fonts = new FontCache(doc)
  const all = doc.getPages()
  const targets = options.pages ?? all.map((_, index) => index)
  const watermark = options.watermark
  const numbers = options.pageNumbers
  const watermarkImage = watermark?.image ? await doc.embedPng(watermark.image.bytes) : null

  for (const [position, index] of targets.entries()) {
    const page = all[index]
    if (!page) continue
    const box = pageBox(page)
    const display = displaySize(box)

    if (watermark && (watermark.text.trim() || watermarkImage)) {
      const rotate = degrees(box.rotation + watermark.angle)
      const opacity = watermark.opacity
      if (watermarkImage && watermark.image) {
        const { width, height } = watermark.image
        for (const anchor of watermarkAnchors(display, width, height, watermark.angle, watermark.layout)) {
          const point = localToPdf(box, anchor.x, anchor.y)
          page.drawImage(watermarkImage, { x: point.x, y: point.y, width, height, rotate, opacity })
        }
      } else {
        const font = await fonts.get('helvetica', watermark.bold ?? true)
        const width = font.widthOfTextAtSize(watermark.text, watermark.fontSize)
        const height = watermark.fontSize * 0.72
        for (const anchor of watermarkAnchors(display, width, height, watermark.angle, watermark.layout)) {
          const point = localToPdf(box, anchor.x, anchor.y)
          page.drawText(watermark.text, {
            x: point.x,
            y: point.y,
            size: watermark.fontSize,
            font,
            color: hexToRgb(watermark.color),
            opacity,
            rotate,
          })
        }
      }
    }

    if (numbers) {
      const font = await fonts.get('helvetica')
      const label = pageNumberLabel(numbers.template, numbers.start + position, numbers.start + targets.length - 1)
      const width = font.widthOfTextAtSize(label, numbers.fontSize)
      const anchor = numberAnchor(display, width, numbers.fontSize, numbers.position, numbers.margin)
      const point = localToPdf(box, anchor.x, anchor.y)
      page.drawText(label, {
        x: point.x,
        y: point.y,
        size: numbers.fontSize,
        font,
        color: hexToRgb(numbers.color),
        rotate: degrees(box.rotation),
      })
    }
  }
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Sign, annotate and fill forms
// ---------------------------------------------------------------------------

/** Positions are fractions of the displayed page, measured from its top-left corner. */
export type EditItem =
  | {
      kind: 'text'
      page: number
      u: number
      v: number
      text: string
      fontSize: number
      font: FontKey
      bold?: boolean
      color: string
      image?: RasterText
    }
  | { kind: 'image'; page: number; u: number; v: number; w: number; h: number; bytes: Uint8Array; format: 'png' | 'jpg' }
  | { kind: 'rect'; page: number; u: number; v: number; w: number; h: number; color: string; opacity: number }
  | { kind: 'check'; page: number; u: number; v: number; w: number; h: number; color: string }
  | {
      kind: 'shape'
      page: number
      u: number
      v: number
      w: number
      h: number
      shape: ShapeKind
      stroke: string
      /** Stroke width in points. */
      width: number
      fill?: string
      direction?: LineDirection
    }
  | {
      kind: 'ink'
      page: number
      u: number
      v: number
      w: number
      h: number
      /** x, y pairs as fractions of the item's box. */
      points: number[]
      color: string
      width: number
    }

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow'

export type FormValues = Record<string, string | boolean>

export interface EditOptions {
  items: EditItem[]
  form?: { values: FormValues; flatten: boolean }
}

export type FormFieldType = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'list' | 'other'

export interface FormFieldInfo {
  name: string
  type: FormFieldType
  value: string | boolean
  options: string[]
  multiline: boolean
  readOnly: boolean
}

export function readFormFields(doc: PDFDocument): FormFieldInfo[] {
  if (!doc.catalog.has(PDFName.of('AcroForm'))) return []
  return doc
    .getForm()
    .getFields()
    .map((field) => {
      const base = { name: field.getName(), readOnly: field.isReadOnly(), multiline: false, options: [] as string[] }
      if (field instanceof PDFTextField) return { ...base, type: 'text', value: field.getText() ?? '', multiline: field.isMultiline() }
      if (field instanceof PDFCheckBox) return { ...base, type: 'checkbox', value: field.isChecked() }
      if (field instanceof PDFDropdown) return { ...base, type: 'dropdown', value: field.getSelected()[0] ?? '', options: field.getOptions() }
      if (field instanceof PDFRadioGroup) return { ...base, type: 'radio', value: field.getSelected() ?? '', options: field.getOptions() }
      if (field instanceof PDFOptionList) return { ...base, type: 'list', value: field.getSelected()[0] ?? '', options: field.getOptions() }
      return { ...base, type: 'other', value: '' }
    })
}

export async function readPdfFormFields(source: PdfSource): Promise<FormFieldInfo[]> {
  return readFormFields(await loadPdf(source))
}

function fillForm(doc: PDFDocument, values: FormValues): void {
  const form = doc.getForm()
  for (const [name, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(name)
    if (!field || field.isReadOnly()) continue
    if (field instanceof PDFTextField) field.setText(String(value))
    else if (field instanceof PDFCheckBox) {
      if (value === true) field.check()
      else field.uncheck()
    } else if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && typeof value === 'string' && value) field.select(value)
    else if (field instanceof PDFRadioGroup && typeof value === 'string' && value) field.select(value)
  }
}

export async function editPdf(source: PdfSource, options: EditOptions): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  const fonts = new FontCache(doc)
  const pages = doc.getPages()
  const images = new Map<Uint8Array, Promise<PDFImage>>()
  const image = (bytes: Uint8Array, format: 'png' | 'jpg') => {
    let cached = images.get(bytes)
    if (!cached) {
      cached = embedImage(doc, bytes, format)
      images.set(bytes, cached)
    }
    return cached
  }

  if (options.form && Object.keys(options.form.values).length > 0) fillForm(doc, options.form.values)

  for (const item of options.items) {
    const page = pages[item.page]
    if (!page) continue
    const box = pageBox(page)
    const display = displaySize(box)
    const rotate = degrees(box.rotation)
    const left = item.u * display.width
    const top = (1 - item.v) * display.height

    switch (item.kind) {
      case 'text': {
        if (item.image) {
          const embedded = await image(item.image.bytes, 'png')
          const point = localToPdf(box, left, top - item.image.height)
          page.drawImage(embedded, { x: point.x, y: point.y, width: item.image.width, height: item.image.height, rotate })
          break
        }
        const font = await fonts.get(item.font, item.bold)
        const color = hexToRgb(item.color)
        item.text.split('\n').forEach((line, index) => {
          if (!line) return
          const baseline = top - item.fontSize * (TEXT_ASCENT + index * TEXT_LINE_HEIGHT)
          const point = localToPdf(box, left, baseline)
          page.drawText(line, { x: point.x, y: point.y, size: item.fontSize, font, color, rotate })
        })
        break
      }
      case 'image': {
        const embedded = await image(item.bytes, item.format)
        const width = item.w * display.width
        const height = item.h * display.height
        const point = localToPdf(box, left, top - height)
        page.drawImage(embedded, { x: point.x, y: point.y, width, height, rotate })
        break
      }
      case 'rect': {
        const right = left + item.w * display.width
        const bottom = top - item.h * display.height
        // A polygon through the mapped corners stays exact on rotated pages.
        const corners = [
          localToPdf(box, left, top),
          localToPdf(box, right, top),
          localToPdf(box, right, bottom),
          localToPdf(box, left, bottom),
        ]
        const path = `M ${corners.map((corner) => `${corner.x} ${-corner.y}`).join(' L ')} Z`
        page.drawSvgPath(path, { x: 0, y: 0, color: hexToRgb(item.color), opacity: item.opacity, borderWidth: 0 })
        break
      }
      case 'check': {
        const width = item.w * display.width
        const height = item.h * display.height
        const bottom = top - height
        const stroke = [
          [0.14, 0.52],
          [0.4, 0.22],
          [0.86, 0.8],
        ].map(([fx, fy]) => localToPdf(box, left + fx * width, bottom + fy * height))
        const thickness = Math.max(1, Math.min(width, height) * 0.13)
        const color = hexToRgb(item.color)
        for (let index = 0; index < stroke.length - 1; index += 1) {
          page.drawLine({ start: stroke[index], end: stroke[index + 1], thickness, color, lineCap: LineCapStyle.Round })
        }
        break
      }
      case 'shape':
      case 'ink': {
        const width = item.w * display.width
        const height = item.h * display.height
        // Local points have y growing downward from the item's top-left corner.
        const map = (point: Point) => localToPdf(box, left + point.x, top - point.y)
        const at = (point: Point) => {
          const mapped = map(point)
          return `${mapped.x} ${-mapped.y}`
        }
        let path = ''
        if (item.kind === 'ink') {
          for (let index = 0; index + 1 < item.points.length; index += 2) {
            path += `${index ? ' L ' : 'M '}${at({ x: item.points[index] * width, y: item.points[index + 1] * height })}`
          }
        } else if (item.shape === 'rect') {
          path = `M ${at({ x: 0, y: 0 })} L ${at({ x: width, y: 0 })} L ${at({ x: width, y: height })} L ${at({ x: 0, y: height })} Z`
        } else if (item.shape === 'ellipse') {
          const { start, curves } = ellipseCurves(width, height)
          path = `M ${at(start)} ${curves.map(([c1, c2, end]) => `C ${at(c1)} ${at(c2)} ${at(end)}`).join(' ')} Z`
        } else {
          const [from, to] = lineEnds(item.direction ?? 0, width, height)
          path = `M ${at(from)} L ${at(to)}`
          if (item.shape === 'arrow') {
            const [a, b] = arrowBarbs(from, to, Math.max(6, item.width * 4))
            path += ` M ${at(a)} L ${at(to)} L ${at(b)}`
          }
        }
        if (!path) break
        const stroke = item.kind === 'ink' ? item.color : item.stroke
        const fill = item.kind === 'shape' && item.fill && (item.shape === 'rect' || item.shape === 'ellipse') ? hexToRgb(item.fill) : undefined
        page.drawSvgPath(path, {
          x: 0,
          y: 0,
          color: fill,
          borderColor: hexToRgb(stroke),
          borderWidth: item.width,
          borderLineCap: LineCapStyle.Round,
        })
        break
      }
    }
  }

  if (options.form?.flatten && doc.catalog.has(PDFName.of('AcroForm'))) doc.getForm().flatten()
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Properties and security
// ---------------------------------------------------------------------------

export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
  created: Date | null
  modified: Date | null
}

export type EditableMetadata = Pick<PdfMetadata, 'title' | 'author' | 'subject' | 'keywords'>

export function readMetadata(doc: PDFDocument): PdfMetadata {
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    created: doc.getCreationDate() ?? null,
    modified: doc.getModificationDate() ?? null,
  }
}

export async function readPdfMetadata(source: PdfSource): Promise<PdfMetadata> {
  return readMetadata(await loadPdf(source))
}

const INFO_KEYS = ['Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer', 'CreationDate', 'ModDate']

/** Writes the given properties, or removes every document property and the XMP packet when `strip` is set. */
export async function updatePdfMetadata(source: PdfSource, metadata: EditableMetadata, strip = false): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  if (strip) {
    const info = doc.context.lookup(doc.context.trailerInfo.Info)
    if (info instanceof PDFDict) for (const key of INFO_KEYS) info.delete(PDFName.of(key))
    doc.catalog.delete(PDFName.of('Metadata'))
    return doc.save({ useObjectStreams: true })
  }
  doc.setTitle(metadata.title)
  doc.setAuthor(metadata.author)
  doc.setSubject(metadata.subject)
  doc.setKeywords(metadata.keywords.split(/\s*[,;]\s*/).filter(Boolean))
  return savePdf(doc)
}

export interface ProtectOptions {
  userPassword: string
  /** Full-access password; defaults to the open password. */
  ownerPassword?: string
  allowPrinting: boolean
  allowCopying: boolean
  allowEditing: boolean
}

export async function protectPdf(source: PdfSource, options: ProtectOptions): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  doc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword || options.userPassword,
    permissions: {
      printing: options.allowPrinting ? 'highResolution' : false,
      copying: options.allowCopying,
      contentAccessibility: true,
      modifying: options.allowEditing,
      annotating: options.allowEditing,
      fillingForms: options.allowEditing,
      documentAssembly: options.allowEditing,
    },
  })
  return doc.save({ useObjectStreams: false })
}

/** Saves a decrypted copy; needs the password the document was opened with. */
export async function unlockPdf(source: PdfSource): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  return doc.save({ useObjectStreams: true })
}

export async function isPdfEncrypted(bytes: Uint8Array): Promise<boolean> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  return doc.isEncrypted
}

// ---------------------------------------------------------------------------
// Page edits done in place, so forms, links and bookmarks survive
// ---------------------------------------------------------------------------

export async function removePages(source: PdfSource, indices: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  const count = doc.getPageCount()
  const unique = [...new Set(indices)].filter((index) => index >= 0 && index < count).sort((a, b) => b - a)
  if (unique.length >= count) throw new Error('A PDF needs at least one page')
  for (const index of unique) doc.removePage(index)
  return savePdf(doc)
}

/** Clockwise quarter turns to add, by zero-based page index. */
export async function rotatePages(source: PdfSource, turns: Record<number, number>): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  doc.getPages().forEach((page, index) => {
    const turn = turns[index]
    if (turn) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + turn * 90)))
  })
  return savePdf(doc)
}

/** A visible area as fractions of the displayed page, from its top-left corner. */
export interface CropRect {
  u: number
  v: number
  w: number
  h: number
}

/** Sets the crop box of each page that has a rectangle; `null` leaves a page alone. */
export async function cropPdf(source: PdfSource, crops: (CropRect | null)[]): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  doc.getPages().forEach((page, index) => {
    const crop = crops[index]
    if (!crop) return
    const box = pageBox(page)
    const corners = [
      toPdfPoint(box, crop.u, crop.v),
      toPdfPoint(box, crop.u + crop.w, crop.v + crop.h),
    ]
    const x = Math.min(corners[0].x, corners[1].x)
    const y = Math.min(corners[0].y, corners[1].y)
    const width = Math.abs(corners[1].x - corners[0].x)
    const height = Math.abs(corners[1].y - corners[0].y)
    if (width < 1 || height < 1) return
    page.setCropBox(x, y, width, height)
    page.setTrimBox(x, y, width, height)
  })
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Creating form fields
// ---------------------------------------------------------------------------

export type NewFieldType = 'text' | 'multiline' | 'checkbox' | 'dropdown' | 'signature'

export interface NewField {
  type: NewFieldType
  name: string
  page: number
  u: number
  v: number
  w: number
  h: number
  options?: string[]
  required?: boolean
  fontSize?: number
}

function uniqueName(taken: Set<string>, wanted: string): string {
  const base = wanted.trim().replace(/[.\s]+/g, '_') || 'field'
  let name = base
  for (let suffix = 2; taken.has(name); suffix += 1) name = `${base}_${suffix}`
  taken.add(name)
  return name
}

/** Adds fillable fields; signature fields become text fields labelled for a typed signature. */
export async function addFormFields(source: PdfSource, fields: NewField[]): Promise<Uint8Array> {
  const doc = await loadPdf(source)
  const form = doc.getForm()
  const pages = doc.getPages()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const taken = new Set(form.getFields().map((field) => field.getName()))
  for (const field of fields) {
    const page = pages[field.page]
    if (!page) continue
    const box = pageBox(page)
    const a = toPdfPoint(box, field.u, field.v)
    const b = toPdfPoint(box, field.u + field.w, field.v + field.h)
    const rect = {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
      font,
      borderColor: rgb(0.55, 0.6, 0.7),
      borderWidth: 0.75,
      backgroundColor: rgb(0.94, 0.96, 1),
      rotate: degrees(box.rotation),
    }
    const name = uniqueName(taken, field.name)
    switch (field.type) {
      case 'text':
      case 'multiline':
      case 'signature': {
        const text = form.createTextField(name)
        if (field.type === 'multiline') text.enableMultiline()
        text.addToPage(page, rect)
        text.setFontSize(field.fontSize ?? (field.type === 'multiline' ? 10 : 0))
        if (field.required) text.enableRequired()
        break
      }
      case 'checkbox': {
        const box = form.createCheckBox(name)
        box.addToPage(page, rect)
        if (field.required) box.enableRequired()
        break
      }
      case 'dropdown': {
        const dropdown = form.createDropdown(name)
        const options = (field.options ?? []).map((option) => option.trim()).filter(Boolean)
        if (options.length) dropdown.addOptions(options)
        dropdown.addToPage(page, rect)
        if (field.required) dropdown.enableRequired()
        break
      }
    }
  }
  return savePdf(doc)
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

/**
 * Re-reads every object without trusting the cross-reference table and writes a
 * clean file. Throws when the structure is too damaged to parse.
 */
export async function rebuildPdf(bytes: Uint8Array, password?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, {
    password,
    ignoreEncryption: password === undefined,
    throwOnInvalidObject: false,
    updateMetadata: false,
  })
  if (doc.isEncrypted && password === undefined) throw new EncryptedPDFError()
  if (doc.getPageCount() === 0) throw new Error('No pages could be recovered')
  return doc.save({ useObjectStreams: true })
}
