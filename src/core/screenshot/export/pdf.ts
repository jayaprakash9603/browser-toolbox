import { jsPDF } from 'jspdf'

import type { LinkRect, TextRun } from '@/core/screenshot/types'

export interface PdfExportOptions {
  splitPages?: 'none' | 'a4' | 'letter'
  links?: LinkRect[]
  textRuns?: TextRun[]
  imageType?: 'PNG' | 'JPEG'
  jpegQuality?: number
}

export async function exportCanvasToPdf(
  canvas: HTMLCanvasElement,
  options: PdfExportOptions = {},
): Promise<Blob> {
  const split = options.splitPages ?? 'none'
  const imgType = options.imageType ?? 'PNG'
  const dataUrl = canvas.toDataURL(imgType === 'JPEG' ? 'image/jpeg' : 'image/png', options.jpegQuality)

  if (split === 'none') {
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    })
    pdf.addImage(dataUrl, imgType, 0, 0, canvas.width, canvas.height)
    addLinkAnnotations(pdf, options.links ?? [], 1, canvas.height)
    addInvisibleText(pdf, options.textRuns ?? [], 1, canvas.height)
    return pdf.output('blob')
  }

  const pageFormat = split === 'letter' ? 'letter' : 'a4'
  const pdf = new jsPDF({ unit: 'pt', format: pageFormat })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const scale = pageW / canvas.width
  const sliceH = pageH / scale
  let y = 0
  let pageIndex = 0
  while (y < canvas.height) {
    if (pageIndex > 0) pdf.addPage()
    const h = Math.min(sliceH, canvas.height - y)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = h
    const ctx = slice.getContext('2d')
    if (!ctx) break
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    const sliceUrl = slice.toDataURL(imgType === 'JPEG' ? 'image/jpeg' : 'image/png')
    pdf.addImage(sliceUrl, imgType, 0, 0, pageW, h * scale)
    addLinkAnnotations(pdf, options.links ?? [], pageIndex + 1, h * scale, y / scale)
    addInvisibleText(pdf, options.textRuns ?? [], pageIndex + 1, h * scale, y / scale)
    y += h
    pageIndex++
  }
  return pdf.output('blob')
}

function addLinkAnnotations(
  pdf: jsPDF,
  links: LinkRect[],
  _page: number,
  pageHeightCss: number,
  yOffsetCss = 0,
): void {
  for (const link of links) {
    const top = link.y - yOffsetCss
    if (top < 0 || top > pageHeightCss) continue
    try {
      pdf.link(link.x, top, link.width, link.height, { url: link.href })
    } catch {
      /* ignore invalid links */
    }
  }
}

function addInvisibleText(
  pdf: jsPDF,
  runs: TextRun[],
  _page: number,
  pageHeightCss: number,
  yOffsetCss = 0,
): void {
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(1)
  for (const run of runs) {
    const top = run.y - yOffsetCss
    if (top < 0 || top > pageHeightCss) continue
    try {
      pdf.setTextColor(255, 255, 255)
      pdf.text(run.text.slice(0, 200), run.x, top + run.height * 0.8)
    } catch {
      /* ignore */
    }
  }
}
