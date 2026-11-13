import type { LinkCheckResult } from '@/core/engines/linkChecker/check'
import { sendMessage } from '@/core/messaging'
import { requestAllSitesAccess } from '@/core/permissions/siteAccess'
import {
  healthCacheKey,
  healthRecordFrom,
  scanUrlForCheck,
  shouldRecheck,
  type BookmarkHealthRecord,
} from '@/core/bookmarks'
import { isHttpUrl } from '@/core/bookmarks'
import type { BookmarkRow } from './service'

const CHUNK = 20

export async function scanBookmarkHealth(
  rows: readonly BookmarkRow[],
  existing: Record<string, BookmarkHealthRecord>,
  onProgress: (done: number, total: number) => void,
): Promise<Record<string, BookmarkHealthRecord>> {
  const granted = await requestAllSitesAccess()
  if (!granted) throw new Error('host-denied')
  const targets = rows.filter((row) => isHttpUrl(row.url) && shouldRecheck(existing[healthCacheKey(row.url)]))
  const next = { ...existing }
  const total = targets.length
  onProgress(0, total)
  for (let i = 0; i < targets.length; i += CHUNK) {
    const slice = targets.slice(i, i + CHUNK)
    const results = await sendMessage<LinkCheckResult[]>({
      type: 'CHECK_HTTP_URLS',
      items: slice.map((row) => ({ href: scanUrlForCheck(row.url), text: row.title })),
    })
    results?.forEach((result, index) => {
      const row = slice[index]
      if (row) next[healthCacheKey(row.url)] = healthRecordFrom(result)
    })
    onProgress(Math.min(i + CHUNK, total), total)
  }
  return next
}
