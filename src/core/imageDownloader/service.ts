import { STORAGE_KEYS } from '@/core/constants'
import { DEFAULT_IMAGE_FILTER, type ImageFilterState } from '@/core/engines/imageDownloader'
import type { GridDensity, ImageDownloadMode } from '@/core/engines/imageDownloader/types'
import { get, set } from '@/core/storage'

export interface ImageDownloaderSettings {
  subfolderTemplate: string
  filenameTemplate: string
  mode: ImageDownloadMode
  gridDensity: GridDensity
  filters: ImageFilterState
  dismissDownloadFolderTip: boolean
}

export const DEFAULT_IMAGE_DOWNLOADER_SETTINGS: ImageDownloaderSettings = {
  subfolderTemplate: 'Images/{host}',
  filenameTemplate: '{name}-{index}',
  mode: 'files',
  gridDensity: 'm',
  filters: { ...DEFAULT_IMAGE_FILTER },
  dismissDownloadFolderTip: false,
}

export async function getImageDownloaderSettings(): Promise<ImageDownloaderSettings> {
  const stored = await get<Partial<ImageDownloaderSettings>>(STORAGE_KEYS.imageDownloader)
  if (!stored) return { ...DEFAULT_IMAGE_DOWNLOADER_SETTINGS, filters: { ...DEFAULT_IMAGE_FILTER } }
  return {
    subfolderTemplate: stored.subfolderTemplate ?? DEFAULT_IMAGE_DOWNLOADER_SETTINGS.subfolderTemplate,
    filenameTemplate: stored.filenameTemplate ?? DEFAULT_IMAGE_DOWNLOADER_SETTINGS.filenameTemplate,
    mode: stored.mode === 'zip' ? 'zip' : 'files',
    gridDensity: stored.gridDensity === 's' || stored.gridDensity === 'l' ? stored.gridDensity : 'm',
    filters: { ...DEFAULT_IMAGE_FILTER, ...stored.filters },
    dismissDownloadFolderTip: stored.dismissDownloadFolderTip ?? false,
  }
}

export async function updateImageDownloaderSettings(
  patch: Partial<ImageDownloaderSettings>,
): Promise<ImageDownloaderSettings> {
  const current = await getImageDownloaderSettings()
  const next: ImageDownloaderSettings = {
    subfolderTemplate: patch.subfolderTemplate ?? current.subfolderTemplate,
    filenameTemplate: patch.filenameTemplate ?? current.filenameTemplate,
    mode: patch.mode ?? current.mode,
    gridDensity: patch.gridDensity ?? current.gridDensity,
    filters: patch.filters ? { ...current.filters, ...patch.filters } : current.filters,
    dismissDownloadFolderTip: patch.dismissDownloadFolderTip ?? current.dismissDownloadFolderTip,
  }
  await set(STORAGE_KEYS.imageDownloader, next)
  return next
}
