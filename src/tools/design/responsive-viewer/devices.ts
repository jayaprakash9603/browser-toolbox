export type DeviceKind = 'phone' | 'tablet' | 'laptop' | 'desktop'

export interface Device {
  id: string
  label: string
  kind: DeviceKind
  width: number
  height: number
  custom?: boolean
}

export const DEVICE_KINDS: readonly DeviceKind[] = ['phone', 'tablet', 'laptop', 'desktop']

/** CSS viewport sizes (logical pixels), portrait for handhelds. */
export const DEVICES: readonly Device[] = [
  { id: 'iphone-se', label: 'iPhone SE', kind: 'phone', width: 375, height: 667 },
  { id: 'iphone', label: 'iPhone 15', kind: 'phone', width: 393, height: 852 },
  { id: 'iphone-pro-max', label: 'iPhone 15 Pro Max', kind: 'phone', width: 430, height: 932 },
  { id: 'pixel', label: 'Pixel 8', kind: 'phone', width: 412, height: 915 },
  { id: 'galaxy', label: 'Galaxy S24', kind: 'phone', width: 360, height: 780 },
  { id: 'ipad-mini', label: 'iPad Mini', kind: 'tablet', width: 768, height: 1024 },
  { id: 'ipad-air', label: 'iPad Air', kind: 'tablet', width: 820, height: 1180 },
  { id: 'ipad', label: 'iPad Pro 12.9"', kind: 'tablet', width: 1024, height: 1366 },
  { id: 'surface', label: 'Surface Pro 7', kind: 'tablet', width: 912, height: 1368 },
  { id: 'laptop', label: 'Laptop 13"', kind: 'laptop', width: 1280, height: 800 },
  { id: 'laptop-hd', label: 'Laptop HD', kind: 'laptop', width: 1366, height: 768 },
  { id: 'macbook-air', label: 'MacBook Air 13"', kind: 'laptop', width: 1470, height: 956 },
  { id: 'desktop', label: 'Desktop HD', kind: 'desktop', width: 1920, height: 1080 },
  { id: 'desktop-2k', label: 'Desktop 2K', kind: 'desktop', width: 2560, height: 1440 },
]

export const CUSTOM_MIN = 240
export const CUSTOM_MAX = 3840

export function kindForWidth(width: number): DeviceKind {
  if (width < 600) return 'phone'
  if (width < 1100) return 'tablet'
  if (width < 1700) return 'laptop'
  return 'desktop'
}

export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= CUSTOM_MIN && value <= CUSTOM_MAX
}

/** Viewport size after applying the device's orientation. */
export function orientedSize(device: Device, rotated: boolean): { width: number; height: number } {
  return rotated ? { width: device.height, height: device.width } : { width: device.width, height: device.height }
}

const BREAKPOINTS = [
  ['2xl', 1536],
  ['xl', 1280],
  ['lg', 1024],
  ['md', 768],
  ['sm', 640],
] as const

/** Tailwind-style breakpoint active at a viewport width. */
export function breakpointFor(width: number): string {
  return BREAKPOINTS.find(([, min]) => width >= min)?.[0] ?? 'xs'
}

export type ZoomMode = 'fit' | '0.25' | '0.5' | '0.75' | '1'
export const ZOOM_MODES: readonly ZoomMode[] = ['fit', '0.25', '0.5', '0.75', '1']

/** Scale for a viewport. In fit mode the device must fit both the available width and height. */
export function viewportScale(
  zoom: ZoomMode,
  size: { width: number; height: number },
  box: { width: number | null; maxHeight: number },
): number {
  if (zoom !== 'fit') return Number(zoom)
  const byHeight = box.maxHeight / size.height
  const byWidth = box.width == null ? Infinity : box.width / size.width
  return Math.max(0.05, Math.min(1, byWidth, byHeight))
}

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)(:\d+)?(\/|$)/i

/** Turns typed input into a loadable http(s) URL, or null. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value || /\s/.test(value)) return null
  const hasScheme = /^https?:\/\//i.test(value)
  if (!hasScheme && /^[a-z][a-z\d+.-]*:\/\//i.test(value)) return null
  const candidate = hasScheme ? value : `${LOCAL_HOST.test(value) ? 'http' : 'https'}://${value}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.') && !LOCAL_HOST.test(url.host)) return null
    return url.href
  } catch {
    return null
  }
}

export type LayoutMode = 'grid' | 'row'

export interface ViewerSettings {
  selected: string[]
  rotated: string[]
  custom: Device[]
  zoom: ZoomMode
  layout: LayoutMode
  frame: boolean
  unblock: boolean
}

export const DEFAULT_SETTINGS: ViewerSettings = {
  selected: ['iphone', 'ipad-mini', 'laptop'],
  rotated: [],
  custom: [],
  zoom: 'fit',
  layout: 'grid',
  frame: true,
  unblock: true,
}

const STORAGE_KEY = 'responsive-viewer:v1'

function isDevice(value: unknown): value is Device {
  if (!value || typeof value !== 'object') return false
  const d = value as Device
  return (
    typeof d.id === 'string' &&
    typeof d.label === 'string' &&
    DEVICE_KINDS.includes(d.kind) &&
    isValidDimension(d.width) &&
    isValidDimension(d.height)
  )
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : null)

export function parseSettings(raw: string | null): ViewerSettings {
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof ViewerSettings, unknown>>
    const custom = Array.isArray(parsed.custom) ? parsed.custom.filter(isDevice).map((d) => ({ ...d, custom: true })) : []
    const known = new Set([...DEVICES, ...custom].map((d) => d.id))
    return {
      selected: strings(parsed.selected)?.filter((id) => known.has(id)) ?? DEFAULT_SETTINGS.selected,
      rotated: strings(parsed.rotated)?.filter((id) => known.has(id)) ?? [],
      custom,
      zoom: ZOOM_MODES.includes(parsed.zoom as ZoomMode) ? (parsed.zoom as ZoomMode) : DEFAULT_SETTINGS.zoom,
      layout: parsed.layout === 'row' ? 'row' : 'grid',
      frame: typeof parsed.frame === 'boolean' ? parsed.frame : DEFAULT_SETTINGS.frame,
      unblock: typeof parsed.unblock === 'boolean' ? parsed.unblock : DEFAULT_SETTINGS.unblock,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function loadSettings(): ViewerSettings {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function storeSettings(settings: ViewerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable; the viewer just starts from defaults next time.
  }
}
