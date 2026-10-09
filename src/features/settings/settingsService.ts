import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { DEFAULT_PALETTE, isPaletteId, type PaletteId } from '@/shared/lib/theme/palettes'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Density = 'compact' | 'comfortable'

export interface Settings {
  theme: ThemeMode
  palette: PaletteId
  density: Density
  clipboardHistoryEnabled: boolean
  clipboardHistoryLimit: number
  clipboardRetentionDays: number
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  palette: DEFAULT_PALETTE,
  density: 'comfortable',
  clipboardHistoryEnabled: true,
  clipboardHistoryLimit: 100,
  clipboardRetentionDays: 0,
}

export async function getSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>(STORAGE_KEYS.settings)
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  if (!isPaletteId(merged.palette)) merged.palette = DEFAULT_PALETTE
  return merged
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await set(STORAGE_KEYS.settings, next)
  return next
}

export async function resetSettings(): Promise<Settings> {
  await set(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}
