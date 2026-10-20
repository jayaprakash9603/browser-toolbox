import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { IMAGE_SAVE_FORMATS, type ImageSaveFormat, type SaveImageAsState } from './types'

export const DEFAULT_SAVE_IMAGE_AS_STATE: SaveImageAsState = {
  enabled: true,
  formats: [...IMAGE_SAVE_FORMATS],
  quality: 0.92,
  askFilename: false,
}

export async function getSaveImageAsState(): Promise<SaveImageAsState> {
  const stored = await get<Partial<SaveImageAsState>>(STORAGE_KEYS.saveImageAs)
  if (!stored) return { ...DEFAULT_SAVE_IMAGE_AS_STATE }
  const formats = (stored.formats ?? DEFAULT_SAVE_IMAGE_AS_STATE.formats).filter((f): f is ImageSaveFormat =>
    IMAGE_SAVE_FORMATS.includes(f as ImageSaveFormat),
  )
  return {
    enabled: stored.enabled ?? DEFAULT_SAVE_IMAGE_AS_STATE.enabled,
    formats: formats.length ? formats : [...IMAGE_SAVE_FORMATS],
    quality: clampQuality(stored.quality ?? DEFAULT_SAVE_IMAGE_AS_STATE.quality),
    askFilename: stored.askFilename ?? false,
  }
}

export async function updateSaveImageAsState(patch: Partial<SaveImageAsState>): Promise<SaveImageAsState> {
  const current = await getSaveImageAsState()
  const next: SaveImageAsState = {
    enabled: patch.enabled ?? current.enabled,
    formats: patch.formats ?? current.formats,
    quality: patch.quality !== undefined ? clampQuality(patch.quality) : current.quality,
    askFilename: patch.askFilename ?? current.askFilename,
  }
  await set(STORAGE_KEYS.saveImageAs, next)
  return next
}

function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return DEFAULT_SAVE_IMAGE_AS_STATE.quality
  return Math.min(1, Math.max(0.1, q))
}
