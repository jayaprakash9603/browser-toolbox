import type { DownloadManagerSettings } from './types'
import { buildOrganizedPath, type FilenameBuildInput } from './filenames'

export function resolveOrganizedFilename(
  settings: DownloadManagerSettings,
  input: FilenameBuildInput,
  options: { extensionOwned: boolean; allowForAllDownloads: boolean },
): string | undefined {
  if (!settings.autoOrganize) return undefined
  if (!options.extensionOwned && !settings.organizeAllBrowserDownloads) return undefined
  return buildOrganizedPath(settings, input)
}
