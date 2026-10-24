import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

type PdfJs = typeof import('pdfjs-dist')

let loading: Promise<PdfJs> | null = null

/** Loads PDF.js and its worker on first use so other tools never pay for it. */
export function loadPdfJs(): Promise<PdfJs> {
  loading ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default
    return lib
  })
  return loading
}

export class PdfPasswordError extends Error {
  readonly incorrect: boolean

  constructor(incorrect: boolean) {
    super(incorrect ? 'Incorrect password' : 'Password required')
    this.name = 'PdfPasswordError'
    this.incorrect = incorrect
  }
}

export type PdfDocumentHandle = PDFDocumentProxy

export async function openPdfDocument(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  const lib = await loadPdfJs()
  // PDF.js transfers the buffer to its worker, so it gets a copy.
  const task = lib.getDocument({ data: bytes.slice(), password, enableXfa: false, useSystemFonts: true })
  try {
    return await task.promise
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new PdfPasswordError((error as Error & { code?: number }).code === lib.PasswordResponses.INCORRECT_PASSWORD)
    }
    throw error
  }
}

/** Frees the worker-side document; the handle is unusable afterwards. */
export function closePdfDocument(doc: PDFDocumentProxy): Promise<void> {
  return doc.loadingTask.destroy()
}

export interface PdfPageInfo {
  /** Displayed size in points, after the page's own rotation. */
  width: number
  height: number
  rotation: number
}

export async function readPageInfo(doc: PDFDocumentProxy): Promise<PdfPageInfo[]> {
  const pages: PdfPageInfo[] = []
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number)
    const viewport = page.getViewport({ scale: 1 })
    pages.push({ width: viewport.width, height: viewport.height, rotation: page.rotate })
  }
  return pages
}

/** Canvases above this many pixels are scaled down to keep memory in check. */
const MAX_PIXELS = 16_000_000

export interface RenderOptions {
  scale: number
  /** Extra clockwise rotation in degrees. */
  rotation?: number
  background?: string
}

export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number, options: RenderOptions): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber)
  const rotation = (((page.rotate + (options.rotation ?? 0)) % 360) + 360) % 360
  let viewport = page.getViewport({ scale: options.scale, rotation })
  const pixels = viewport.width * viewport.height
  if (pixels > MAX_PIXELS) viewport = page.getViewport({ scale: options.scale * Math.sqrt(MAX_PIXELS / pixels), rotation })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  await page.render({ canvas, viewport, background: options.background ?? '#ffffff' }).promise
  page.cleanup()
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the page image'))), type, quality)
  })
}

export async function renderPdfPageBlob(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: RenderOptions & { type?: string; quality?: number },
): Promise<Blob> {
  const canvas = await renderPdfPage(doc, pageNumber, options)
  const blob = await canvasToBlob(canvas, options.type, options.quality)
  canvas.width = 0
  canvas.height = 0
  return blob
}

/**
 * Page text with line breaks where lines change and blank lines at larger gaps,
 * which is close enough to paragraphs for search and Word export.
 */
export async function extractPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber)
  const content = await page.getTextContent()
  let text = ''
  let lastY: number | null = null
  let lastHeight = 0
  for (const item of content.items) {
    if (!('str' in item)) continue
    const { str, transform, height, hasEOL } = item as TextItem
    const y = transform[5]
    if (lastY !== null) {
      const gap = Math.abs(y - lastY)
      const lineHeight = Math.max(height, lastHeight, 1)
      const breaks = gap > lineHeight * 1.8 ? 2 : gap > lineHeight * 0.4 ? 1 : 0
      const trailing = text.endsWith('\n\n') ? 2 : text.endsWith('\n') ? 1 : 0
      if (breaks > trailing) text += '\n'.repeat(breaks - trailing)
    }
    text += str
    if (hasEOL) text += '\n'
    lastY = y
    if (height) lastHeight = height
  }
  page.cleanup()
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

interface DecodedImage {
  width: number
  height: number
  bitmap?: ImageBitmap
  data?: Uint8ClampedArray
  /** 1 = 1-bit grey, 2 = RGB, 3 = RGBA. */
  kind?: number
}

function decodedToCanvas(image: DecodedImage): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) return null
  if (image.bitmap) {
    context.drawImage(image.bitmap, 0, 0)
    return canvas
  }
  if (!image.data) return null
  const pixels = context.createImageData(image.width, image.height)
  const out = pixels.data
  const source = image.data
  const count = image.width * image.height
  if (image.kind === 3) out.set(source.subarray(0, count * 4))
  else if (image.kind === 2) {
    for (let index = 0; index < count; index += 1) {
      out[index * 4] = source[index * 3]
      out[index * 4 + 1] = source[index * 3 + 1]
      out[index * 4 + 2] = source[index * 3 + 2]
      out[index * 4 + 3] = 255
    }
  } else {
    const rowBytes = (image.width + 7) >> 3
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const bit = (source[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1
        const value = bit ? 255 : 0
        const offset = (y * image.width + x) * 4
        out[offset] = out[offset + 1] = out[offset + 2] = value
        out[offset + 3] = 255
      }
    }
  }
  context.putImageData(pixels, 0, 0)
  return canvas
}

/** Pictures drawn on a page, decoded at their stored resolution. `seen` skips images already returned for earlier pages. */
export async function extractPageImages(doc: PDFDocumentProxy, pageNumber: number, seen: Set<string> = new Set(), minSize = 24): Promise<HTMLCanvasElement[]> {
  const lib = await loadPdfJs()
  const page = await doc.getPage(pageNumber)
  const operators = await page.getOperatorList()
  const canvases: HTMLCanvasElement[] = []
  const paint = new Set([lib.OPS.paintImageXObject, lib.OPS.paintImageXObjectRepeat])
  for (let index = 0; index < operators.fnArray.length; index += 1) {
    if (!paint.has(operators.fnArray[index])) continue
    const id = operators.argsArray[index]?.[0]
    if (typeof id !== 'string' || seen.has(id)) continue
    seen.add(id)
    const store = id.startsWith('g_') ? page.commonObjs : page.objs
    const image = await new Promise<DecodedImage | null>((resolve) => {
      try {
        store.get(id, (value: unknown) => resolve((value as DecodedImage) ?? null))
      } catch {
        resolve(null)
      }
    })
    if (!image || image.width < minSize || image.height < minSize) continue
    const canvas = decodedToCanvas(image)
    if (canvas) canvases.push(canvas)
  }
  page.cleanup()
  return canvases
}

/** One horizontal run of text in display points, measured from the page's top-left corner. */
export interface TextRun {
  str: string
  x: number
  /** Top of the glyph box. */
  y: number
  w: number
  h: number
  /** Font size in points. */
  size: number
  bold: boolean
  italic: boolean
  /** Ends a line in the source. */
  eol: boolean
}

export interface PageLink {
  url: string
  x: number
  y: number
  w: number
  h: number
}

export interface PageText {
  width: number
  height: number
  runs: TextRun[]
  links: PageLink[]
}

const BOLD_FONT = /bold|black|heavy|semibold|demi/i
const ITALIC_FONT = /italic|oblique/i

/**
 * Positioned text of one page. `fonts` also loads the font program names so bold and
 * italic runs can be told apart, which costs a full parse of the page.
 */
export async function readPageText(doc: PDFDocumentProxy, pageNumber: number, options: { fonts?: boolean; links?: boolean } = {}): Promise<PageText> {
  const lib = await loadPdfJs()
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const fontNames = new Map<string, string>()
  if (options.fonts) {
    await page.getOperatorList()
    for (const item of content.items) {
      if (!('fontName' in item) || fontNames.has(item.fontName)) continue
      try {
        const font = page.commonObjs.get(item.fontName) as { name?: string; bold?: boolean; italic?: boolean } | undefined
        fontNames.set(item.fontName, `${font?.name ?? ''}${font?.bold ? ' bold' : ''}${font?.italic ? ' italic' : ''}`)
      } catch {
        fontNames.set(item.fontName, '')
      }
    }
  }
  const runs: TextRun[] = []
  for (const item of content.items) {
    if (!('str' in item)) continue
    const text = item as TextItem
    if (!text.str) {
      if (text.hasEOL && runs.length) runs[runs.length - 1].eol = true
      continue
    }
    const tx = lib.Util.transform(viewport.transform, text.transform) as number[]
    // Skip vertical and rotated runs; they do not take part in line layout.
    if (Math.abs(tx[1]) > Math.abs(tx[0]) * 0.1 || Math.abs(tx[2]) > Math.abs(tx[3]) * 0.1) continue
    const size = Math.hypot(tx[2], tx[3]) || text.height || 10
    const width = Math.abs(text.width) || text.str.length * size * 0.5
    const name = fontNames.get(text.fontName) ?? ''
    runs.push({
      str: text.str,
      x: tx[4],
      y: tx[5] - size * 0.86,
      w: width,
      h: size,
      size,
      bold: BOLD_FONT.test(name),
      italic: ITALIC_FONT.test(name),
      eol: text.hasEOL,
    })
  }
  const links: PageLink[] = []
  if (options.links) {
    const annotations = (await page.getAnnotations()) as { subtype?: string; url?: string; rect?: number[] }[]
    for (const annotation of annotations) {
      if (annotation.subtype !== 'Link' || !annotation.url || !annotation.rect) continue
      const m = viewport.transform
      const [ax, ay, bx, by] = annotation.rect
      const x1 = m[0] * ax + m[2] * ay + m[4]
      const y1 = m[1] * ax + m[3] * ay + m[5]
      const x2 = m[0] * bx + m[2] * by + m[4]
      const y2 = m[1] * bx + m[3] * by + m[5]
      links.push({ url: annotation.url, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) })
    }
  }
  page.cleanup()
  return { width: viewport.width, height: viewport.height, runs, links }
}
