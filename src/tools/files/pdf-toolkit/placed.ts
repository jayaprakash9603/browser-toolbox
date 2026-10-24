import type { EditItem, FontKey, ShapeKind } from '@/core/engines/pdf/edit'
import type { LineDirection } from '@/core/engines/pdf/geometry'
import { pdfSafeText } from './raster'

export type PlaceTool =
  | 'select'
  | 'signature'
  | 'text'
  | 'date'
  | 'check'
  | 'highlight'
  | 'cover'
  | 'image'
  | 'box'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'draw'

/** Tools that draw a box by dragging; a plain click places a default size. */
export const DRAG_TOOLS: ReadonlySet<PlaceTool> = new Set(['highlight', 'cover', 'box', 'ellipse', 'line', 'arrow'])

export const SHAPE_FOR_TOOL: Partial<Record<PlaceTool, ShapeKind>> = { box: 'rect', ellipse: 'ellipse', line: 'line', arrow: 'arrow' }

interface Base {
  id: string
  /** Zero-based page index. */
  page: number
  /** Left and top edge as fractions of the displayed page. */
  u: number
  v: number
}

export type Placed =
  | (Base & { kind: 'text'; text: string; fontSize: number; font: FontKey; bold: boolean; color: string })
  | (Base & { kind: 'image'; w: number; h: number; url: string; bytes: Uint8Array; format: 'png' | 'jpg'; signature: boolean })
  | (Base & { kind: 'rect'; w: number; h: number; color: string; opacity: number; variant: 'cover' | 'highlight' })
  | (Base & { kind: 'check'; w: number; h: number; color: string })
  | (Base & { kind: 'shape'; w: number; h: number; shape: ShapeKind; stroke: string; width: number; fill: string | null; direction: LineDirection })
  | (Base & { kind: 'ink'; w: number; h: number; points: number[]; color: string; width: number })

export type BoxItem = Exclude<Placed, { kind: 'text' }>

export interface PendingImage {
  url: string
  bytes: Uint8Array
  format: 'png' | 'jpg'
  width: number
  height: number
  signature: boolean
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Key under `pdf.sign.itemLabel` naming an item for screen readers and the properties panel. */
export function itemLabelKey(item: Placed): string {
  if (item.kind === 'image') return item.signature ? 'signature' : 'image'
  if (item.kind === 'rect') return item.variant
  if (item.kind === 'shape') return item.shape
  return item.kind
}

export async function toEditItems(items: Placed[]): Promise<EditItem[]> {
  const out: EditItem[] = []
  for (const item of items) {
    const { page, u, v } = item
    switch (item.kind) {
      case 'text': {
        if (!item.text.trim()) break
        const style = { fontSize: item.fontSize, font: item.font, bold: item.bold, color: item.color }
        const safe = await pdfSafeText(item.text, style)
        out.push({ kind: 'text', page, u, v, text: safe.text, image: safe.image, ...style })
        break
      }
      case 'image':
        out.push({ kind: 'image', page, u, v, w: item.w, h: item.h, bytes: item.bytes, format: item.format })
        break
      case 'rect':
        out.push({ kind: 'rect', page, u, v, w: item.w, h: item.h, color: item.color, opacity: item.opacity })
        break
      case 'check':
        out.push({ kind: 'check', page, u, v, w: item.w, h: item.h, color: item.color })
        break
      case 'shape':
        out.push({ kind: 'shape', page, u, v, w: item.w, h: item.h, shape: item.shape, stroke: item.stroke, width: item.width, fill: item.fill ?? undefined, direction: item.direction })
        break
      case 'ink':
        out.push({ kind: 'ink', page, u, v, w: item.w, h: item.h, points: item.points, color: item.color, width: item.width })
        break
    }
  }
  return out
}
