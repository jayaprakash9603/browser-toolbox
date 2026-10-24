import { STORAGE_KEYS } from '@/core/constants'
import type { ImageLinksSort } from '@/core/engines/imageLinks'
import { get, set } from '@/core/storage'

export type ImageLinksView = 'grid' | 'list'

export interface ImageLinksSettings {
  view: ImageLinksView
  sort: ImageLinksSort
  subfolderTemplate: string
  filenameTemplate: string
  includeManifest: boolean
}

export const DEFAULT_IMAGE_LINKS_SETTINGS: ImageLinksSettings = {
  view: 'grid',
  sort: 'page',
  subfolderTemplate: 'Images/{host}',
  filenameTemplate: '{name}-{index}',
  includeManifest: true,
}

const SORTS: ImageLinksSort[] = ['page', 'largest', 'smallest', 'name', 'type']

export async function getImageLinksSettings(): Promise<ImageLinksSettings> {
  const stored = await get<Partial<ImageLinksSettings>>(STORAGE_KEYS.imageLinks)
  const d = DEFAULT_IMAGE_LINKS_SETTINGS
  if (!stored) return { ...d }
  return {
    view: stored.view === 'list' ? 'list' : 'grid',
    sort: stored.sort && SORTS.includes(stored.sort) ? stored.sort : d.sort,
    subfolderTemplate: typeof stored.subfolderTemplate === 'string' ? stored.subfolderTemplate : d.subfolderTemplate,
    filenameTemplate: stored.filenameTemplate?.trim() ? stored.filenameTemplate : d.filenameTemplate,
    includeManifest: stored.includeManifest ?? d.includeManifest,
  }
}

export async function saveImageLinksSettings(settings: ImageLinksSettings): Promise<void> {
  await set(STORAGE_KEYS.imageLinks, settings)
}
