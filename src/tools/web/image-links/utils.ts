import type { ImageLinkItem } from '@/core/engines/imageLinks'

export const CHECKERBOARD =
  'bg-background bg-[length:16px_16px] bg-[image:repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)]'

export const EASE = [0.2, 0.8, 0.2, 1] as const

export interface ImageItemActions {
  onToggle: (item: ImageLinkItem, shiftKey: boolean) => void
  onPreview: (item: ImageLinkItem) => void
  onCopy: (text: string) => void
  onDownload: (item: ImageLinkItem) => void
  onMeasure: (url: string, width: number, height: number) => void
}

export function formatDims(width: number, height: number): string | null {
  return width > 0 && height > 0 ? `${width}×${height}` : null
}

export function typeLabel(type: ImageLinkItem['type'], otherLabel: string): string {
  return type === 'other' ? otherLabel : type.toUpperCase()
}

export function displayUrl(url: string): string {
  if (url.startsWith('data:')) {
    const mime = /^data:([^;,]+)/.exec(url)?.[1] ?? 'data'
    const kb = Math.max(1, Math.round(url.length / 1024))
    return `data:${mime} · ~${kb} KB`
  }
  return url.replace(/^https?:\/\//i, '')
}

export function pageSlug(pageUrl: string | undefined): string {
  try {
    const host = new URL(pageUrl ?? '').hostname.replace(/^www\./i, '')
    return host.replace(/[^a-z0-9.-]+/gi, '-') || 'page'
  } catch {
    return 'page'
  }
}

export function dateStamp(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
