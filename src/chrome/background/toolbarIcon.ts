import { STORAGE_KEYS } from '@/core/constants'
import type { NetStatus } from '@/core/netmon/types'
import { getSettings, type Settings } from '@/features/settings/settingsService'
import { DEFAULT_PALETTE, isPaletteId, paletteIconPaths, type PaletteId } from '@/shared/lib/theme/palettes'

const DOT_COLORS: Record<NetStatus, string> = {
  online: '#16a34a',
  lan: '#f59e0b',
  offline: '#dc2626',
  nodata: '#9ca3af',
}

const SIZES = [16, 32] as const
const bitmaps = new Map<PaletteId, Map<number, ImageBitmap>>()
let palette: PaletteId | null = null
let status: NetStatus | null = null
/** Undefined until first applied: the icon outlives service-worker restarts, so the first call always sets it. */
let shown: string | undefined
let queue: Promise<void> = Promise.resolve()

async function loadBitmaps(id: PaletteId): Promise<Map<number, ImageBitmap>> {
  const cached = bitmaps.get(id)
  if (cached) return cached
  const paths = paletteIconPaths(id)
  const map = new Map<number, ImageBitmap>()
  for (const size of SIZES) {
    const blob = await (await fetch(chrome.runtime.getURL(paths[size]))).blob()
    map.set(size, await createImageBitmap(blob))
  }
  bitmaps.set(id, map)
  return map
}

async function render(): Promise<void> {
  palette ??= (await getSettings()).palette
  const key = `${palette}:${status ?? ''}`
  if (key === shown) return
  shown = key
  try {
    if (!status) {
      await chrome.action.setIcon({ path: paletteIconPaths(palette) })
      return
    }
    const source = await loadBitmaps(palette)
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

function enqueueRender(): Promise<void> {
  queue = queue.then(render, render)
  return queue
}

/** The badge belongs to the ad blocker, so internet status is drawn as a dot on the icon itself. */
export function showToolbarStatus(next: NetStatus | null): Promise<void> {
  status = next
  return enqueueRender()
}

/** Keeps the toolbar icon in the colour of the palette chosen in Settings. */
export function registerToolbarIcon(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEYS.settings in changes)) return
    const next = (changes[STORAGE_KEYS.settings].newValue as Partial<Settings> | undefined)?.palette
    const resolved = next && isPaletteId(next) ? next : DEFAULT_PALETTE
    if (resolved === palette) return
    palette = resolved
    void enqueueRender()
  })
  void enqueueRender()
}
