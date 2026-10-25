import { encodeBmp } from './bmp'
import { canvasToBlob } from './canvas'
import { applyFilenameTemplate, formatDateParts } from '@/core/screenshot/filename'
import type { PageInfo } from '@/core/screenshot/types'

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'pdf'

export async function exportCanvas(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  opts?: { jpegQuality?: number; pdfSplit?: 'none' | 'a4' | 'letter'; links?: import('@/core/screenshot/types').LinkRect[]; textRuns?: import('@/core/screenshot/types').TextRun[] },
): Promise<Blob> {
  switch (format) {
    case 'png':
      return canvasToBlob(canvas, 'image/png')
    case 'jpeg':
      return canvasToBlob(canvas, 'image/jpeg', opts?.jpegQuality ?? 0.92)
    case 'webp':
      return canvasToBlob(canvas, 'image/webp', opts?.jpegQuality ?? 0.92)
    case 'bmp': {
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const bmp = encodeBmp(rgba, canvas.width, canvas.height)
      return new Blob([new Uint8Array(bmp)], { type: 'image/bmp' })
    }
    case 'gif': {
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const { encodeGifFromRgba } = await import('./gif')
      const bytes = encodeGifFromRgba([{ rgba, width: canvas.width, height: canvas.height }])
      return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
    }
    case 'pdf': {
      const { exportCanvasToPdf } = await import('./pdf')
      return exportCanvasToPdf(canvas, {
        splitPages: opts?.pdfSplit ?? 'none',
        links: opts?.links,
        textRuns: opts?.textRuns,
        jpegQuality: opts?.jpegQuality,
      })
    }
    default:
      return canvasToBlob(canvas, 'image/png')
  }
}

export function buildExportFilename(
  template: string,
  pageInfo: PageInfo | undefined,
  ext: string,
): string {
  const { date, time } = formatDateParts(new Date(pageInfo?.capturedAt ?? Date.now()))
  return applyFilenameTemplate(template, {
    title: pageInfo?.title ?? 'screenshot',
    date,
    time,
    domain: pageInfo?.domain ?? 'page',
    ext,
    url: pageInfo?.url,
  })
}

export async function downloadBlobInExtension(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  try {
    await chrome.downloads.download({ url, filename, saveAs: true })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}

export async function zipBlobs(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const { zipSync } = await import('fflate')
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) {
    entries[file.name] = new Uint8Array(await file.blob.arrayBuffer())
  }
  const zipped = zipSync(entries)
  return new Blob([zipped], { type: 'application/zip' })
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await canvasToBlob(canvas, 'image/png')
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export function openEmailHandoff(pageInfo: PageInfo | undefined, savedPathHint?: string): void {
  const subject = encodeURIComponent(`Screenshot: ${pageInfo?.title ?? 'Page'}`)
  const body = encodeURIComponent(
    `${pageInfo?.url ?? ''}\n\n${savedPathHint ? `File saved: ${savedPathHint}\nAttach it from your downloads folder.` : ''}`,
  )
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`
  void chrome.tabs.create({ url: gmail })
}
