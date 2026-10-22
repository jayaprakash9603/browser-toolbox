import type { Annotation } from '@/core/engines/capture'
import { drawAnnotations } from '@/core/engines/capture'
import type { LinkRect, TextRun } from '@/core/screenshot/types'
import { tileHeights } from '@/core/screenshot/slicePlan'

export async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, 0, 0)
  return canvas
}

export async function stitchSlicesToCanvas(
  slices: { dataUrl: string; scrollY: number }[],
  totalCssHeight: number,
  devicePixelRatio: number,
): Promise<HTMLCanvasElement> {
  const { stitchCaptures } = await import('@/core/engines/capture')
  const result = await stitchCaptures(slices, totalCssHeight, devicePixelRatio)
  if (!result.ok) throw new Error(result.error)
  return dataUrlToCanvas(result.value.dataUrl)
}

export function applyAnnotations(canvas: HTMLCanvasElement, annotations: Annotation[]): void {
  drawAnnotations(canvas, annotations)
}

export function stampPageInfo(
  canvas: HTMLCanvasElement,
  info: { url: string; title: string; domain: string; capturedAt: number },
  position: 'header' | 'footer',
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const pad = 12
  const line = `${info.title} · ${info.domain} · ${new Date(info.capturedAt).toLocaleString()}`
  ctx.save()
  ctx.font = '14px system-ui,sans-serif'
  const barH = 28
  const y = position === 'header' ? 0 : canvas.height - barH
  ctx.fillStyle = 'rgba(15,23,42,.85)'
  ctx.fillRect(0, y, canvas.width, barH)
  ctx.fillStyle = '#f8fafc'
  ctx.fillText(line.slice(0, 120), pad, y + 19)
  ctx.restore()
}

export function splitCanvasTiles(canvas: HTMLCanvasElement, maxTile = 16384): HTMLCanvasElement[] {
  const heights = tileHeights(canvas.height, maxTile)
  const tiles: HTMLCanvasElement[] = []
  let y = 0
  for (const h of heights) {
    const tile = document.createElement('canvas')
    tile.width = canvas.width
    tile.height = h
    const ctx = tile.getContext('2d')
    if (!ctx) continue
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    tiles.push(tile)
    y += h
  }
  return tiles
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
      mime,
      quality,
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

export type PdfLinkInput = LinkRect & { pageIndex: number }

export function mapLinksToPdfPages(
  links: LinkRect[],
  pageHeights: number[],
  scale: number,
): PdfLinkInput[] {
  const out: PdfLinkInput[] = []
  let yOffset = 0
  for (let pageIndex = 0; pageIndex < pageHeights.length; pageIndex++) {
    const pageH = pageHeights[pageIndex]
    for (const link of links) {
      if (link.y + link.height < yOffset || link.y > yOffset + pageH) continue
      out.push({
        ...link,
        y: (link.y - yOffset) * scale,
        pageIndex,
      })
    }
    yOffset += pageH
  }
  return out
}

export function textRunsForSearchLayer(runs: TextRun[]): TextRun[] {
  return runs.filter((r) => r.text.length > 0)
}
