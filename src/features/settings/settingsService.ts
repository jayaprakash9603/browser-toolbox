import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

export type ThemeMode = 'light' | 'dark' | 'system'
export type Density = 'compact' | 'comfortable'

export interface Settings {
  theme: ThemeMode
  density: Density
  clipboardHistoryEnabled: boolean
  clipboardHistoryLimit: number
  clipboardRetentionDays: number
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  density: 'comfortable',
  clipboardHistoryEnabled: true,
  clipboardHistoryLimit: 100,
  clipboardRetentionDays: 0,
}

export async function getSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>(STORAGE_KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...stored }
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
