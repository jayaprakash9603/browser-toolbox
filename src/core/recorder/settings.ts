import type { RecorderSettings } from './types'

export const DEFAULT_RECORDER_SETTINGS: RecorderSettings = {
  mic: false,
  tabAudio: true,
  countdown: true,
  quality: '1080p',
}

const STORAGE_KEY = 'recorderSettings'

export async function loadRecorderSettings(): Promise<RecorderSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return { ...DEFAULT_RECORDER_SETTINGS }
  }
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const raw = stored[STORAGE_KEY] as Partial<RecorderSettings> | undefined
  return { ...DEFAULT_RECORDER_SETTINGS, ...raw }
}

export async function saveRecorderSettings(patch: Partial<RecorderSettings>): Promise<RecorderSettings> {
  const next = { ...(await loadRecorderSettings()), ...patch }
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
  return next
}

export function videoConstraints(quality: RecorderSettings['quality']): { width: number; height: number } {
  return quality === '720p' ? { width: 1280, height: 720 } : { width: 1920, height: 1080 }
}
