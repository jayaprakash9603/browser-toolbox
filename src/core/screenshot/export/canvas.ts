import type { Annotation } from '@/core/engines/capture'
import { drawAnnotations } from '@/core/engines/capture'
import type {
  CaptureRect,
  CaptureSlice,
  LinkRect,
  ScreenshotFrame,
  TextRun,
} from '@/core/screenshot/types'
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

/** Chrome refuses to allocate canvases taller than this. */
const MAX_CANVAS_HEIGHT = 32000

export interface SliceDraw {
  sx: number
  sy: number
  width: number
  height: number
  dx: number
  dy: number
}

/** Pixel copy for one slice: the part of `region` it shows, in image and output coordinates. */
export function planSliceDraw(
  slice: CaptureSlice,
  region: CaptureRect,
  imageCss: { width: number; height: number },
  dpr: number,
): SliceDraw | null {
  const view = slice.view ?? { x: 0, y: 0, width: imageCss.width, height: imageCss.height }
  const contentX = slice.scrollX ?? 0
  const contentY = slice.scrollY
  const left = Math.max(region.x, contentX)
  const top = Math.max(region.y, contentY)
  const right = Math.min(region.x + region.width, contentX + view.width)
  const bottom = Math.min(region.y + region.height, contentY + view.height)
  if (right <= left || bottom <= top) return null
  return {
    sx: Math.round((left - contentX + view.x) * dpr),
    sy: Math.round((top - contentY + view.y) * dpr),
    width: Math.round((right - left) * dpr),
    height: Math.round((bottom - top) * dpr),
    dx: Math.round((left - region.x) * dpr),
    dy: Math.round((top - region.y) * dpr),
  }
}

export async function stitchFrameToCanvas(frame: ScreenshotFrame): Promise<HTMLCanvasElement> {
  const slices = frame.slices ?? []
  if (slices.length === 0) throw new Error('Nothing was captured.')
  const images = await Promise.all(slices.map((slice) => loadImage(slice.dataUrl)))
  const dpr = frame.devicePixelRatio || 1
  const first = { width: images[0].naturalWidth / dpr, height: images[0].naturalHeight / dpr }
  const region = frame.region ?? {
    x: 0,
    y: 0,
    width: slices[0].view?.width ?? first.width,
    height: frame.stitchHeight ?? first.height,
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(region.width * dpr))
  canvas.height = Math.max(1, Math.min(Math.round(region.height * dpr), MAX_CANVAS_HEIGHT))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  slices.forEach((slice, index) => {
    const img = images[index]
    const draw = planSliceDraw(
      slice,
      region,
      { width: img.naturalWidth / dpr, height: img.naturalHeight / dpr },
      dpr,
    )
    if (!draw) return
    ctx.drawImage(img, draw.sx, draw.sy, draw.width, draw.height, draw.dx, draw.dy, draw.width, draw.height)
  })
  return canvas
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
