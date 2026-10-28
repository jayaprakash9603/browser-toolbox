import { STORAGE_KEYS } from '@/core/constants'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'
import { get, set } from '@/core/storage'
import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from '@/shared/lib/theme/palettes'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Density = 'compact' | 'comfortable'

export interface Settings {
  theme: ThemeMode
  palette: PaletteId
  density: Density
  clipboardHistoryEnabled: boolean
  /** Also record copies made on web pages, which needs a script on every site. */
  clipboardCaptureFromPages: boolean
  clipboardHistoryLimit: number
  clipboardRetentionDays: number
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  palette: DEFAULT_PALETTE,
  density: 'comfortable',
  clipboardHistoryEnabled: true,
  clipboardCaptureFromPages: false,
  clipboardHistoryLimit: 100,
  clipboardRetentionDays: 0,
}

export function isPageClipboardCaptureOn(settings: Partial<Settings> | undefined): boolean {
  const merged = { ...DEFAULT_SETTINGS, ...settings }
  return merged.clipboardHistoryEnabled && merged.clipboardCaptureFromPages
}

export async function getSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>(STORAGE_KEYS.settings)
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  if (!isPaletteId(merged.palette)) merged.palette = DEFAULT_PALETTE
  return merged
}

export const SETTINGS_LOCAL_UPDATE_EVENT = 'browser-toolbox:settings-local'

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  const captureTurningOn = isPageClipboardCaptureOn(next) && !isPageClipboardCaptureOn(current)
  if (captureTurningOn && !(await requestAllSitesAccess())) return current
  await set(STORAGE_KEYS.settings, next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_LOCAL_UPDATE_EVENT, { detail: next }))
  }
  return next
}

export async function resetSettings(): Promise<Settings> {
  await set(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_LOCAL_UPDATE_EVENT, { detail: DEFAULT_SETTINGS }))
  }
  return DEFAULT_SETTINGS
}
