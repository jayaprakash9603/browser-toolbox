import {
  healthCacheKey,
  healthRecordFrom,
  isHttpUrl,
  loadBookmarkWorkspace,
  saveBookmarkWorkspace,
  scanUrlForCheck,
  shouldRecheck,
} from '@/core/bookmarks'
import { checkHttpItems } from '@/chrome/background/web/linkChecker'
import { loadBookmarkLibrary } from '@/tools/productivity/bookmarks/service'

const CHUNK = 20
const DAILY_CAP = 400

export async function runScheduledHealthScan(): Promise<void> {
  const allowed = await chrome.permissions.contains({
    permissions: ['bookmarks'],
    origins: ['<all_urls>'],
  })
  if (!allowed) return
  const [library, workspace] = await Promise.all([loadBookmarkLibrary(), loadBookmarkWorkspace()])
  const health = { ...workspace.health }
  const targets = library.rows
    .filter((row) => isHttpUrl(row.url) && shouldRecheck(health[healthCacheKey(row.url)]))
    .slice(0, DAILY_CAP)
  for (let i = 0; i < targets.length; i += CHUNK) {
    const slice = targets.slice(i, i + CHUNK)
    const results = await checkHttpItems(
      slice.map((row) => ({ href: scanUrlForCheck(row.url), text: row.title })),
    )
    results.forEach((result, index) => {
      const row = slice[index]
      if (row) health[healthCacheKey(row.url)] = healthRecordFrom(result)
    })
  }
  await saveBookmarkWorkspace({
    ...workspace,
    health,
    prefs: { ...workspace.prefs, lastHealthScanAt: Date.now() },
  })
}
