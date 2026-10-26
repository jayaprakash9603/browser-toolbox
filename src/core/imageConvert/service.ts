import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import {
  IMAGE_MAX_SIZES,
  IMAGE_NAMING_MODES,
  IMAGE_SAVE_FORMATS,
  type ImageNaming,
  type ImageSaveFormat,
  type SaveImageAsState,
} from './types'

export const DEFAULT_SAVE_IMAGE_AS_STATE: SaveImageAsState = {
  enabled: true,
  formats: [...IMAGE_SAVE_FORMATS],
  quality: 0.92,
  askFilename: false,
  quickFormat: null,
  maxSize: 0,
  background: '#ffffff',
  naming: 'title',
  folder: '',
  notifyOnSave: false,
}

/** Coerces stored or patched values into a valid state; unknown values fall back to defaults. */
export function normalizeSaveImageAsState(raw: Partial<Record<keyof SaveImageAsState, unknown>> | null | undefined): SaveImageAsState {
  const d = DEFAULT_SAVE_IMAGE_AS_STATE
  if (!raw) return { ...d, formats: [...d.formats] }
  const formats = Array.isArray(raw.formats)
    ? [...new Set(raw.formats.filter((f): f is ImageSaveFormat => IMAGE_SAVE_FORMATS.includes(f as ImageSaveFormat)))]
    : []
  const quick = IMAGE_SAVE_FORMATS.includes(raw.quickFormat as ImageSaveFormat) ? (raw.quickFormat as ImageSaveFormat) : null
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : d.enabled,
    formats: formats.length ? formats : [...d.formats],
    quality: clampQuality(typeof raw.quality === 'number' ? raw.quality : d.quality),
    askFilename: typeof raw.askFilename === 'boolean' ? raw.askFilename : d.askFilename,
    quickFormat: quick,
    maxSize: IMAGE_MAX_SIZES.includes(raw.maxSize as (typeof IMAGE_MAX_SIZES)[number]) ? (raw.maxSize as number) : d.maxSize,
    background: typeof raw.background === 'string' && /^#[0-9a-f]{6}$/i.test(raw.background) ? raw.background.toLowerCase() : d.background,
    naming: IMAGE_NAMING_MODES.includes(raw.naming as ImageNaming) ? (raw.naming as ImageNaming) : d.naming,
    folder: typeof raw.folder === 'string' ? sanitizeFolder(raw.folder) : d.folder,
    notifyOnSave: typeof raw.notifyOnSave === 'boolean' ? raw.notifyOnSave : d.notifyOnSave,
  }
}

export async function getSaveImageAsState(): Promise<SaveImageAsState> {
  return normalizeSaveImageAsState(await get<Partial<SaveImageAsState>>(STORAGE_KEYS.saveImageAs))
}

export async function updateSaveImageAsState(patch: Partial<SaveImageAsState>): Promise<SaveImageAsState> {
  const current = await getSaveImageAsState()
  const next = normalizeSaveImageAsState({ ...current, ...patch })
  await set(STORAGE_KEYS.saveImageAs, next)
  return next
}

/** Keeps a relative Downloads subpath: no drive letters, `..`, or characters Chrome rejects. */
export function sanitizeFolder(input: string): string {
  return input
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.replace(/[<>:"|?*\p{Cc}]/gu, '').trim().replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
    .join('/')
    .slice(0, 80)
}

function clampQuality(q: number): number {
  if (!Number.isFinite(q)) return DEFAULT_SAVE_IMAGE_AS_STATE.quality
  return Math.min(1, Math.max(0.1, q))
}
