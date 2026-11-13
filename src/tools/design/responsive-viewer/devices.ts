import { DEVICE_BY_ID, DEVICES as CATALOG, DEFAULT_DEVICE_ID } from './catalog'
import { STORAGE_KEY } from './storageKey'

export { STORAGE_KEY }

export type DeviceKind = 'phone' | 'tablet' | 'laptop' | 'desktop' | 'watch' | 'special'
export type FrameStyle =
  | 'iphone'
  | 'iphone-home'
  | 'android'
  | 'fold'
  | 'flip'
  | 'tablet-ios'
  | 'tablet-android'
  | 'laptop'
  | 'desktop'
  | 'watch'
  | 'kiosk'
  | 'tv'
  | 'generic'
export type NotchStyle = 'none' | 'island' | 'notch' | 'punch-hole' | 'pill'
export type FrameColor = 'black' | 'silver' | 'titanium' | 'white' | 'graphite'
export type FrameColorSetting = FrameColor | 'auto'
export type SpecStatus = 'verified' | 'approximate'
export type StatusBarStyle = 'ios' | 'android' | 'none'
export type NavBarStyle = 'home-indicator' | 'android' | 'none'

export interface SafeArea {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Device {
  id: string
  label: string
  kind: DeviceKind
  width: number
  height: number
  custom?: boolean
  manufacturer?: string
  model?: string
  dpr?: number
  touch?: boolean
  userAgent?: string
  frameStyle?: FrameStyle
  notch?: NotchStyle
  safeArea?: SafeArea
  statusBar?: StatusBarStyle
  navBar?: NavBarStyle
  specStatus?: SpecStatus
  folded?: { width: number; height: number }
  unfolded?: { width: number; height: number }
  frameColor?: FrameColor
}

export const DEVICE_KINDS: readonly DeviceKind[] = ['phone', 'tablet', 'laptop', 'desktop', 'watch', 'special']
export const PICKER_KINDS: readonly DeviceKind[] = ['phone', 'tablet', 'laptop', 'desktop']
export const FRAME_COLORS: readonly FrameColor[] = ['black', 'silver', 'titanium', 'white', 'graphite']
export const MAX_SIMULTANEOUS_DEVICES = 6

export { CATALOG as DEVICES, DEFAULT_DEVICE_ID, DEVICE_BY_ID }

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

export function frameStyleForKind(kind: DeviceKind): FrameStyle {
  if (kind === 'phone') return 'android'
  if (kind === 'tablet') return 'tablet-android'
  if (kind === 'laptop') return 'laptop'
  if (kind === 'desktop') return 'desktop'
  if (kind === 'watch') return 'watch'
  return 'kiosk'
}

export function devicePixelRatio(device: Device): number {
  return device.dpr && device.dpr > 0 ? device.dpr : 1
}

/** Use the device's native chassis unless the user picked an explicit finish. */
export function resolveFrameFinish(
  setting: FrameColorSetting | undefined,
  device?: Pick<Device, 'frameColor'>,
): FrameColor {
  if (setting && setting !== 'auto') return setting
  return device?.frameColor ?? 'black'
}

export function isFoldable(device: Device): boolean {
  return Boolean(device.folded && device.unfolded)
}

export function isHandheld(device: Device): boolean {
  return device.kind === 'phone' || device.kind === 'tablet' || device.kind === 'watch'
}

/** Viewport size after applying orientation and fold state. */
export function orientedSize(
  device: Device,
  rotated: boolean,
  folded = false,
): { width: number; height: number } {
  const base =
    folded && device.folded
      ? device.folded
      : !folded && device.unfolded && device.folded
        ? device.unfolded
        : { width: device.width, height: device.height }
  return rotated ? { width: base.height, height: base.width } : base
}

const DEFAULT_BREAKPOINTS = [
  ['2xl', 1536],
  ['xl', 1280],
  ['lg', 1024],
  ['md', 768],
  ['sm', 640],
] as const

export type BreakpointPreset = { name: string; min: number }

export const TAILWIND_BREAKPOINTS: readonly BreakpointPreset[] = DEFAULT_BREAKPOINTS.map(([name, min]) => ({
  name,
  min,
}))

export const BOOTSTRAP_BREAKPOINTS: readonly BreakpointPreset[] = [
  { name: 'xxl', min: 1400 },
  { name: 'xl', min: 1200 },
  { name: 'lg', min: 992 },
  { name: 'md', min: 768 },
  { name: 'sm', min: 576 },
]

/** Active breakpoint name at a viewport width. */
export function breakpointFor(width: number, presets: readonly BreakpointPreset[] = TAILWIND_BREAKPOINTS): string {
  const sorted = [...presets].sort((a, b) => b.min - a.min)
  return sorted.find((preset) => width >= preset.min)?.name ?? 'xs'
}

export type ZoomMode = 'fit' | '0.25' | '0.5' | '0.75' | '1' | '1.25' | '1.5'
export const ZOOM_MODES: readonly ZoomMode[] = ['fit', '0.25', '0.5', '0.75', '1', '1.25', '1.5']

/** Scale for a viewport. In fit mode the device must fit both the available width and height. */
export function viewportScale(
  zoom: ZoomMode | number,
  size: { width: number; height: number },
  box: { width: number | null; maxHeight: number },
  fitMax = 1,
): number {
  if (zoom !== 'fit') return typeof zoom === 'number' ? zoom : Number(zoom)
  const byHeight = box.maxHeight / size.height
  const byWidth = box.width == null ? Infinity : box.width / size.width
  return Math.max(0.05, Math.min(fitMax, byWidth, byHeight))
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

export type LayoutMode = 'grid' | 'row' | 'vertical' | 'freeform' | 'focus'
export type SyncMode = { nav: boolean; scroll: boolean; clicks: boolean }
export type StudioTheme = 'dark' | 'light' | 'system'
export type BreakpointSet = 'tailwind' | 'bootstrap' | 'custom'
export type CanvasBackground = 'dark' | 'light' | 'white' | 'black' | 'gradient' | 'transparent'

export interface DevicePosition {
  x: number
  y: number
}

export interface PresentationSettings {
  heading: string
  description: string
  background: CanvasBackground
  customBackground: string
  hideChrome: boolean
  showLabels: boolean
  showUrl: boolean
}

export interface SimulatorPreset {
  id: string
  name: string
  selected: string[]
  rotated: string[]
  folded: string[]
  zoom: ZoomMode
  layout: LayoutMode
  frame: boolean
  frameColor: FrameColorSetting
  positions: Record<string, DevicePosition>
  sync: SyncMode
  presentation: PresentationSettings
}

export interface ViewerSettings {
  selected: string[]
  rotated: string[]
  custom: Device[]
  zoom: ZoomMode
  layout: LayoutMode
  frame: boolean
  unblock: boolean
  favorites: string[]
  recents: string[]
  folded: string[]
  frameColor: FrameColorSetting
  lastDevice: string
  studioZoom: number | 'fit'
  studioLayout: LayoutMode
  sync: SyncMode
  presentation: PresentationSettings
  showStatusBar: boolean
  showNavBar: boolean
  showLabels: boolean
  showSafeArea: boolean
  performanceMode: boolean
  studioTheme: StudioTheme
  breakpointSet: BreakpointSet
  customBreakpoints: BreakpointPreset[]
  positions: Record<string, DevicePosition>
  mobileUa: boolean
  tapMarkers: boolean
  presets: SimulatorPreset[]
}

export const DEFAULT_PRESENTATION: PresentationSettings = {
  heading: '',
  description: '',
  background: 'white',
  customBackground: '',
  hideChrome: false,
  showLabels: true,
  showUrl: false,
}

export const DEFAULT_SETTINGS: ViewerSettings = {
  selected: [DEFAULT_DEVICE_ID],
  rotated: [],
  custom: [],
  zoom: 'fit',
  layout: 'grid',
  frame: true,
  unblock: true,
  favorites: [],
  recents: [DEFAULT_DEVICE_ID],
  folded: [],
  frameColor: 'auto',
  lastDevice: DEFAULT_DEVICE_ID,
  studioZoom: 'fit',
  studioLayout: 'focus',
  sync: { nav: true, scroll: false, clicks: false },
  presentation: DEFAULT_PRESENTATION,
  showStatusBar: true,
  showNavBar: true,
  showLabels: true,
  showSafeArea: false,
  performanceMode: false,
  studioTheme: 'light',
  breakpointSet: 'tailwind',
  customBreakpoints: [],
  positions: {},
  mobileUa: false,
  tapMarkers: false,
  presets: [],
}


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

const LAYOUTS: readonly LayoutMode[] = ['grid', 'row', 'vertical', 'freeform', 'focus']
const COLORS: readonly FrameColor[] = FRAME_COLORS

function parseFrameColor(value: unknown, fallback: FrameColorSetting): FrameColorSetting {
  if (value === 'auto' || COLORS.includes(value as FrameColor)) return value as FrameColorSetting
  return fallback
}

function parsePresentation(value: unknown): PresentationSettings {
  if (!value || typeof value !== 'object') return DEFAULT_PRESENTATION
  const raw = value as Partial<PresentationSettings>
  const background: CanvasBackground =
    raw.background === 'light' ||
    raw.background === 'white' ||
    raw.background === 'black' ||
    raw.background === 'gradient' ||
    raw.background === 'transparent' ||
    raw.background === 'dark'
      ? raw.background
      : DEFAULT_PRESENTATION.background
  return {
    heading: typeof raw.heading === 'string' ? raw.heading : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    background,
    customBackground: typeof raw.customBackground === 'string' ? raw.customBackground : '',
    hideChrome: Boolean(raw.hideChrome),
    showLabels: typeof raw.showLabels === 'boolean' ? raw.showLabels : true,
    showUrl: Boolean(raw.showUrl),
  }
}

function parsePreset(value: unknown): SimulatorPreset | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<SimulatorPreset>
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  return {
    id: raw.id,
    name: raw.name,
    selected: strings(raw.selected) ?? [],
    rotated: strings(raw.rotated) ?? [],
    folded: strings(raw.folded) ?? [],
    zoom: ZOOM_MODES.includes(raw.zoom as ZoomMode) ? (raw.zoom as ZoomMode) : 'fit',
    layout: LAYOUTS.includes(raw.layout as LayoutMode) ? (raw.layout as LayoutMode) : 'grid',
    frame: typeof raw.frame === 'boolean' ? raw.frame : true,
    frameColor: parseFrameColor(raw.frameColor, 'auto'),
    positions: parsePositions(raw.positions),
    sync: parseSync(raw.sync),
    presentation: parsePresentation(raw.presentation),
  }
}

function parseSync(value: unknown): SyncMode {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS.sync }
  const raw = value as Partial<SyncMode>
  return {
    nav: typeof raw.nav === 'boolean' ? raw.nav : true,
    scroll: Boolean(raw.scroll),
    clicks: Boolean(raw.clicks),
  }
}

function parsePositions(value: unknown): Record<string, DevicePosition> {
  if (!value || typeof value !== 'object') return {}
  const next: Record<string, DevicePosition> = {}
  for (const [id, pos] of Object.entries(value as Record<string, unknown>)) {
    if (!pos || typeof pos !== 'object') continue
    const x = (pos as DevicePosition).x
    const y = (pos as DevicePosition).y
    if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) {
      next[id] = { x, y }
    }
  }
  return next
}

function parseBreakpoints(value: unknown): BreakpointPreset[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const name = (entry as BreakpointPreset).name
    const min = (entry as BreakpointPreset).min
    if (typeof name !== 'string' || !name.trim()) return []
    if (typeof min !== 'number' || !Number.isFinite(min) || min < 0) return []
    return [{ name: name.trim().slice(0, 12), min: Math.round(min) }]
  })
}

export function knownDeviceIds(custom: readonly Device[]): Set<string> {
  return new Set([...CATALOG, ...custom].map((device) => device.id))
}

export function findDevice(id: string, custom: readonly Device[] = []): Device | undefined {
  return custom.find((device) => device.id === id) ?? DEVICE_BY_ID.get(id)
}

export function parseSettings(raw: string | null): ViewerSettings {
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof ViewerSettings, unknown>>
    const custom = Array.isArray(parsed.custom) ? parsed.custom.filter(isDevice).map((d) => ({ ...d, custom: true })) : []
    const known = knownDeviceIds(custom)
    const selected =
      strings(parsed.selected)?.filter((id) => known.has(id)).slice(0, MAX_SIMULTANEOUS_DEVICES) ??
      DEFAULT_SETTINGS.selected.filter((id) => known.has(id))
    const zoom = ZOOM_MODES.includes(parsed.zoom as ZoomMode) ? (parsed.zoom as ZoomMode) : DEFAULT_SETTINGS.zoom
    const layout = LAYOUTS.includes(parsed.layout as LayoutMode) ? (parsed.layout as LayoutMode) : 'grid'
    const studioLayout = LAYOUTS.includes(parsed.studioLayout as LayoutMode)
      ? (parsed.studioLayout as LayoutMode)
      : 'focus'
    const studioZoom =
      parsed.studioZoom === 'fit'
        ? 'fit'
        : typeof parsed.studioZoom === 'number' && parsed.studioZoom >= 0.1 && parsed.studioZoom <= 3
          ? parsed.studioZoom
          : 'fit'
    const lastDevice =
      typeof parsed.lastDevice === 'string' && known.has(parsed.lastDevice)
        ? parsed.lastDevice
        : (selected[0] ?? DEFAULT_DEVICE_ID)
    return {
      selected: selected.length > 0 ? selected : [lastDevice].filter((id) => known.has(id)),
      rotated: strings(parsed.rotated)?.filter((id) => known.has(id)) ?? [],
      custom,
      zoom,
      layout: layout === 'row' || layout === 'grid' ? layout : layout === 'vertical' ? 'row' : 'grid',
      frame: typeof parsed.frame === 'boolean' ? parsed.frame : DEFAULT_SETTINGS.frame,
      unblock: typeof parsed.unblock === 'boolean' ? parsed.unblock : DEFAULT_SETTINGS.unblock,
      favorites: strings(parsed.favorites)?.filter((id) => known.has(id)) ?? [],
      recents: strings(parsed.recents)?.filter((id) => known.has(id)) ?? [],
      folded: strings(parsed.folded)?.filter((id) => known.has(id)) ?? [],
      frameColor: parseFrameColor(parsed.frameColor, 'auto'),
      lastDevice,
      studioZoom,
      studioLayout,
      sync: parseSync(parsed.sync),
      presentation: parsePresentation(parsed.presentation),
      showStatusBar: typeof parsed.showStatusBar === 'boolean' ? parsed.showStatusBar : true,
      showNavBar: typeof parsed.showNavBar === 'boolean' ? parsed.showNavBar : true,
      showLabels: typeof parsed.showLabels === 'boolean' ? parsed.showLabels : true,
      showSafeArea: Boolean(parsed.showSafeArea),
      performanceMode: Boolean(parsed.performanceMode),
      studioTheme:
        parsed.studioTheme === 'light' || parsed.studioTheme === 'system' || parsed.studioTheme === 'dark'
          ? parsed.studioTheme
          : DEFAULT_SETTINGS.studioTheme,
      breakpointSet:
        parsed.breakpointSet === 'bootstrap' || parsed.breakpointSet === 'custom' ? parsed.breakpointSet : 'tailwind',
      customBreakpoints: parseBreakpoints(parsed.customBreakpoints),
      positions: parsePositions(parsed.positions),
      mobileUa: Boolean(parsed.mobileUa),
      tapMarkers: Boolean(parsed.tapMarkers),
      presets: Array.isArray(parsed.presets) ? parsed.presets.flatMap((entry) => parsePreset(entry) ?? []) : [],
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

export async function hydrateSettings(): Promise<ViewerSettings | null> {
  try {
    const stored = await chrome.storage?.local.get(STORAGE_KEY)
    const raw = stored?.[STORAGE_KEY]
    if (typeof raw === 'string') return parseSettings(raw)
    if (raw && typeof raw === 'object') return parseSettings(JSON.stringify(raw))
  } catch {
    /* storage can be missing in tests */
  }
  return null
}

export function storeSettings(settings: ViewerSettings): void {
  const json = JSON.stringify(settings)
  try {
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    // Storage can be unavailable; the viewer just starts from defaults next time.
  }
  try {
    void chrome.storage?.local.set({ [STORAGE_KEY]: json })
  } catch {
    /* ignore */
  }
}

export function activeBreakpoints(settings: ViewerSettings): readonly BreakpointPreset[] {
  if (settings.breakpointSet === 'bootstrap') return BOOTSTRAP_BREAKPOINTS
  if (settings.breakpointSet === 'custom' && settings.customBreakpoints.length > 0) return settings.customBreakpoints
  return TAILWIND_BREAKPOINTS
}

export function rememberDevice(settings: ViewerSettings, id: string): ViewerSettings {
  const recents = [id, ...settings.recents.filter((item) => item !== id)].slice(0, 12)
  return { ...settings, lastDevice: id, recents }
}

export function exportDeviceProfile(device: Device): string {
  return JSON.stringify(device, null, 2)
}

export function importDeviceProfile(raw: string): Device | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isDevice(parsed)) return null
    return {
      ...parsed,
      id: parsed.custom === false ? parsed.id : `custom-${crypto.randomUUID().slice(0, 8)}`,
      custom: true,
      label: parsed.label.trim() || `Custom ${parsed.width}×${parsed.height}`,
    }
  } catch {
    return null
  }
}
