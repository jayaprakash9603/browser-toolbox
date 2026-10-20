import type { NetStatus } from '@/core/netmon/types'

const DOT_COLORS: Record<NetStatus, string> = {
  online: '#16a34a',
  lan: '#f59e0b',
  offline: '#dc2626',
  nodata: '#9ca3af',
}

const SIZES = [16, 32] as const
let bitmaps: Map<number, ImageBitmap> | null = null
/** Undefined until first applied: the icon outlives service-worker restarts, so the first call always sets it. */
let shown: NetStatus | null | undefined

function manifestIconPath(): string {
  const icons = chrome.runtime.getManifest().icons ?? {}
  return icons['48'] ?? icons['128'] ?? Object.values(icons)[0]
}

async function loadBitmaps(): Promise<Map<number, ImageBitmap>> {
  if (bitmaps) return bitmaps
  const blob = await (await fetch(chrome.runtime.getURL(manifestIconPath()))).blob()
  const map = new Map<number, ImageBitmap>()
  for (const size of SIZES) {
    map.set(size, await createImageBitmap(blob, { resizeWidth: size, resizeHeight: size, resizeQuality: 'high' }))
  }
  bitmaps = map
  return map
}

/** The badge belongs to the ad blocker, so status is drawn as a dot on the icon itself. */
export async function showToolbarStatus(status: NetStatus | null): Promise<void> {
  if (status === shown) return
  shown = status
  try {
    if (!status) {
      const icons = chrome.runtime.getManifest().icons ?? {}
      await chrome.action.setIcon({ path: icons as Record<string, string> })
      return
    }
    const source = await loadBitmaps()
    const imageData: Record<string, ImageData> = {}
    for (const size of SIZES) {
      const canvas = new OffscreenCanvas(size, size)
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.drawImage(source.get(size)!, 0, 0, size, size)
      const r = size * 0.24
      const cx = size - r - 0.5
      const cy = size - r - 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, r + size * 0.06, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = DOT_COLORS[status]
      ctx.fill()
      imageData[String(size)] = ctx.getImageData(0, 0, size, size)
    }
    await chrome.action.setIcon({ imageData })
  } catch {
    shown = undefined
  }
}
