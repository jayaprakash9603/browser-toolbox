import type { PageSpec } from '@/core/engines/pdf/edit'
import { canvasToBlob, readPageText, renderPdfPage, type PageText, type PdfDocumentHandle, type PdfPageInfo } from '@/core/engines/pdf/pdfjs'

/** Positioned text for every page, in order. */
export async function readAllPages(
  handle: PdfDocumentHandle,
  options: { fonts?: boolean; links?: boolean; onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<PageText[]> {
  const pages: PageText[] = []
  for (let page = 1; page <= handle.numPages; page += 1) {
    options.signal?.throwIfAborted()
    pages.push(await readPageText(handle, page, options))
    options.onProgress?.(page, handle.numPages)
  }
  return pages
}

export interface RasterOptions {
  dpi?: number
  quality?: number
  /** Draws on top of the rendered page, in canvas pixels. */
  paint?: (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, index: number) => void
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

/** One image page per PDF page, at the page's own size in points. */
export async function rasterizePage(handle: PdfDocumentHandle, index: number, info: PdfPageInfo, options: RasterOptions = {}): Promise<PageSpec> {
  const canvas = await renderPdfPage(handle, index + 1, { scale: (options.dpi ?? 150) / 72 })
  const context = canvas.getContext('2d')
  if (context && options.paint) options.paint(context, canvas, index)
  const blob = await canvasToBlob(canvas, 'image/jpeg', options.quality ?? 0.88)
  canvas.width = 0
  canvas.height = 0
  return { kind: 'image', bytes: new Uint8Array(await blob.arrayBuffer()), format: 'jpg', width: info.width, height: info.height }
}

export async function rasterizePages(handle: PdfDocumentHandle, pages: PdfPageInfo[], options: RasterOptions = {}): Promise<PageSpec[]> {
  const specs: PageSpec[] = []
  for (let index = 0; index < pages.length; index += 1) {
    options.signal?.throwIfAborted()
    specs.push(await rasterizePage(handle, index, pages[index], options))
    options.onProgress?.(index + 1, pages.length)
  }
  return specs
}
