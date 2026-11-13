import {
  getDownloadManagerState,
  resolveOrganizedFilename,
  type FilenameBuildInput,
} from '@/core/download-manager'
import { takeRequestedName } from '../downloadNames'

export async function buildFilenameSuggestion(
  item: chrome.downloads.DownloadItem,
): Promise<chrome.downloads.FilenameSuggestion | undefined> {
  const extensionOwned = item.byExtensionId === chrome.runtime.id
  const requested = takeRequestedName(item.url)
  const input: FilenameBuildInput = {
    url: item.finalUrl || item.url,
    referrer: item.referrer,
    mime: item.mime,
    suggestedName: requested || item.filename,
  }
  const { settings } = await getDownloadManagerState()
  if (!settings.enabled) {
    return requested ? { filename: requested, conflictAction: 'uniquify' } : undefined
  }
  const organized = resolveOrganizedFilename(settings, input, {
    extensionOwned,
    allowForAllDownloads: settings.organizeAllBrowserDownloads,
  })
  if (organized) return { filename: organized, conflictAction: 'uniquify' }
  if (requested) return { filename: requested, conflictAction: 'uniquify' }
  return undefined
}
