/**
 * Chrome drops the `filename` given to `chrome.downloads.download` whenever an
 * `onDeterminingFilename` listener answers without a suggestion (blob URLs then save as a GUID),
 * so the download guard re-applies the name recorded here.
 */
const requestedNames = new Map<string, string>()
const NAME_TTL_MS = 60_000

export async function downloadWithName(
  options: chrome.downloads.DownloadOptions & { filename: string },
): Promise<number> {
  requestedNames.set(options.url, options.filename)
  setTimeout(() => requestedNames.delete(options.url), NAME_TTL_MS)
  try {
    return await chrome.downloads.download(options)
  } catch (error) {
    requestedNames.delete(options.url)
    throw error
  }
}

export function takeRequestedName(url: string): string | undefined {
  const name = requestedNames.get(url)
  requestedNames.delete(url)
  return name
}
