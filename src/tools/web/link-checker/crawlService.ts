import type { CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import type { SiteLinksCrawlResult } from '@/chrome/content/linkCheckerCrawl'
import { ensureContentScriptInTab, getActiveBrowserTab } from '@/chrome/contentScriptClient'
import type { ExtensionResponse } from '@/core/messaging/types'

import type { CrawlOptions } from '@/core/engines/htmlArchive/crawl'

let activeCrawlId: string | null = null

export function getActiveLinkCrawlId(): string | null {
  return activeCrawlId
}

export async function stopActiveSiteLinkCrawl(): Promise<void> {
  const crawlId = activeCrawlId
  if (!crawlId) return
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return
  await chrome.tabs.sendMessage(tab.id, { type: 'STOP_LINK_CRAWL', crawlId }).catch(() => {})
}

export async function crawlSiteLinks(
  crawl: CrawlOptions,
  onProgress: (progress: CrawlProgress) => void,
): Promise<SiteLinksCrawlResult> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) throw new Error('No active tab')
  await ensureContentScriptInTab(tab.id)
  const crawlId = crypto.randomUUID()
  activeCrawlId = crawlId

  return new Promise((resolve, reject) => {
    const onMessage = (message: { type?: string; crawlId?: string; progress?: CrawlProgress }) => {
      if (message?.type === 'LINK_CRAWL_PROGRESS' && message.crawlId === crawlId && message.progress) {
        onProgress(message.progress)
      }
      return false
    }
    chrome.runtime.onMessage.addListener(onMessage)

    const finish = () => {
      chrome.runtime.onMessage.removeListener(onMessage)
      if (activeCrawlId === crawlId) activeCrawlId = null
    }

    void chrome.tabs
      .sendMessage(tab.id!, { type: 'CRAWL_SITE_FOR_LINKS', crawlId, crawl })
      .then((response) => {
        finish()
        const typed = response as ExtensionResponse<SiteLinksCrawlResult>
        if (typed?.ok) resolve(typed.data)
        else reject(new Error(typed?.error ?? 'Crawl failed'))
      })
      .catch((error: unknown) => {
        finish()
        reject(error instanceof Error ? error : new Error(String(error)))
      })
  })
}
