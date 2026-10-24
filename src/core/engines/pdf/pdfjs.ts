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
