import { jsPDF } from 'jspdf'

import type { LinkRect, TextRun } from '@/core/screenshot/types'

/** A4 width in PDF points (~8.27 in at 72 pt/in). */
const PDF_PAGE_WIDTH_PT = 595.28
/** Sharp text on screen and print without embedding full device-pixel canvases. */
const TARGET_DPI = 150
const TARGET_WIDTH_PX = Math.round((PDF_PAGE_WIDTH_PT / 72) * TARGET_DPI)
/** Long full-page captures: cap height before JPEG encode to keep files reasonable. */
const MAX_PDF_HEIGHT_PX = 28_000
/** Hard cap on raster pixels (~12–16 MB JPEG typical for UI screenshots). */
const MAX_PDF_PIXELS = 14_000_000
const DEFAULT_PDF_JPEG_QUALITY = 0.92

export interface PdfExportOptions {
  splitPages?: 'none' | 'a4' | 'letter'
  links?: LinkRect[]
  textRuns?: TextRun[]
  imageType?: 'PNG' | 'JPEG'
  jpegQuality?: number
}

function scaleCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (source.width === width && source.height === height) return source
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')
  if (!ctx) return source
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return out
}

/**
 * Resize for PDF: match page width to ~150 DPI, then only shrink further for extreme height/pixel count.
 * Avoids the old max-edge cap that crushed wide images on tall full-page captures.
 */
function prepareCanvasForPdf(source: HTMLCanvasElement): HTMLCanvasElement {
  let width = source.width
  let height = source.height

  if (width > TARGET_WIDTH_PX) {
    const s = TARGET_WIDTH_PX / width
    width = TARGET_WIDTH_PX
    height = Math.max(1, Math.round(height * s))
  }

  if (height > MAX_PDF_HEIGHT_PX) {
    const s = MAX_PDF_HEIGHT_PX / height
    height = MAX_PDF_HEIGHT_PX
    width = Math.max(1, Math.round(width * s))
  }

  if (width * height > MAX_PDF_PIXELS) {
    const s = Math.sqrt(MAX_PDF_PIXELS / (width * height))
    width = Math.max(1, Math.round(width * s))
    height = Math.max(1, Math.round(height * s))
  }

  return scaleCanvas(source, width, height)
}

function rasterDataUrl(canvas: HTMLCanvasElement, imgType: 'PNG' | 'JPEG', jpegQuality: number): string {
  return canvas.toDataURL(imgType === 'JPEG' ? 'image/jpeg' : 'image/png', jpegQuality)
}

export async function exportCanvasToPdf(
  canvas: HTMLCanvasElement,
  options: PdfExportOptions = {},
): Promise<Blob> {
  const split = options.splitPages ?? 'none'
  const jpegQuality = options.jpegQuality ?? DEFAULT_PDF_JPEG_QUALITY
  const imgType: 'PNG' | 'JPEG' = options.imageType ?? 'JPEG'
  const exportCanvas = prepareCanvasForPdf(canvas)
  const srcW = canvas.width
  const srcH = canvas.height

  if (split === 'none') {
    const dataUrl = rasterDataUrl(exportCanvas, imgType, jpegQuality)
    const pageHeightPt = (srcH / srcW) * PDF_PAGE_WIDTH_PT
    const pdf = new jsPDF({
      unit: 'pt',
      format: [PDF_PAGE_WIDTH_PT, pageHeightPt],
      orientation: pageHeightPt > PDF_PAGE_WIDTH_PT ? 'portrait' : 'landscape',
      compress: true,
    })
    pdf.addImage(dataUrl, imgType, 0, 0, PDF_PAGE_WIDTH_PT, pageHeightPt)
    const pdfScaleX = PDF_PAGE_WIDTH_PT / srcW
    const pdfScaleY = pageHeightPt / srcH
    addLinkAnnotations(pdf, options.links ?? [], 1, pageHeightPt, pdfScaleX, pdfScaleY)
    addInvisibleText(pdf, options.textRuns ?? [], 1, pageHeightPt, pdfScaleX, pdfScaleY)
    return pdf.output('blob')
  }

  const pageFormat = split === 'letter' ? 'letter' : 'a4'
  const pdf = new jsPDF({ unit: 'pt', format: pageFormat, compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const scale = pageW / exportCanvas.width
  const sliceH = pageH / scale
  const pdfScaleX = pageW / srcW
  let y = 0
  let pageIndex = 0
  while (y < exportCanvas.height) {
    if (pageIndex > 0) pdf.addPage()
    const h = Math.min(sliceH, exportCanvas.height - y)
    const slice = document.createElement('canvas')
    slice.width = exportCanvas.width
    slice.height = h
    const ctx = slice.getContext('2d')
    if (!ctx) break
    ctx.drawImage(exportCanvas, 0, y, exportCanvas.width, h, 0, 0, exportCanvas.width, h)
    const sliceUrl = rasterDataUrl(slice, imgType, jpegQuality)
    const sliceHeightPt = h * scale
    const pdfScaleY = sliceHeightPt / (h * (srcH / exportCanvas.height))
    const yOffsetSrc = y * (srcH / exportCanvas.height)
    pdf.addImage(sliceUrl, imgType, 0, 0, pageW, sliceHeightPt)
    addLinkAnnotations(pdf, options.links ?? [], pageIndex + 1, sliceHeightPt, pdfScaleX, pdfScaleY, yOffsetSrc)
    addInvisibleText(pdf, options.textRuns ?? [], pageIndex + 1, sliceHeightPt, pdfScaleX, pdfScaleY, yOffsetSrc)
    y += h
    pageIndex++
  }
  return pdf.output('blob')
}

function addLinkAnnotations(
  pdf: jsPDF,
  links: LinkRect[],
  _page: number,
  pageHeightPt: number,
  pdfScaleX: number,
  pdfScaleY: number,
  yOffsetSrc = 0,
): void {
  for (const link of links) {
    const top = (link.y - yOffsetSrc) * pdfScaleY
    if (top < 0 || top > pageHeightPt) continue
    try {
      pdf.link(
        link.x * pdfScaleX,
        top,
        link.width * pdfScaleX,
        link.height * pdfScaleY,
        { url: link.href },
      )
    } catch {
      /* ignore invalid links */
    }
  }
}

function addInvisibleText(
  pdf: jsPDF,
  runs: TextRun[],
  _page: number,
  pageHeightPt: number,
  pdfScaleX: number,
  pdfScaleY: number,
  yOffsetSrc = 0,
): void {
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(1)
  for (const run of runs) {
    const top = (run.y - yOffsetSrc) * pdfScaleY
    if (top < 0 || top > pageHeightPt) continue
    try {
      pdf.setTextColor(255, 255, 255)
      pdf.text(run.text.slice(0, 200), run.x * pdfScaleX, top + run.height * pdfScaleY * 0.8)
    } catch {
      /* ignore */
    }
  }
}
