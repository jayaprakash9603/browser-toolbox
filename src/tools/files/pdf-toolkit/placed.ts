import type { EditItem, FontKey } from '@/core/engines/pdf/edit'
import { pdfSafeText } from './raster'

export type PlaceTool = 'select' | 'signature' | 'text' | 'date' | 'check' | 'highlight' | 'cover' | 'image'

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
    }
  }
  return out
}
