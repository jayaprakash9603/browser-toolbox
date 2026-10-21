import { CONTENT_SCRIPT_IDS, SITE_FILES, YOUTUBE_MATCHES, type YoutubeEnhancerState } from '@/core/sites/youtube'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('sites-youtube-scripts')
const OWNED_SCRIPT_IDS = Object.values(CONTENT_SCRIPT_IDS)

export function buildYoutubeContentScripts(state: YoutubeEnhancerState): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  return [
    {
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [SITE_FILES.isolatedJs],
      matches: [...YOUTUBE_MATCHES],
      runAt: 'document_start',
      allFrames: false,
    },
    {
      id: CONTENT_SCRIPT_IDS.main,
      js: [SITE_FILES.mainJs],
      matches: [...YOUTUBE_MATCHES],
      runAt: 'document_start',
      allFrames: false,
      world: 'MAIN',
    },
  ]
}

export async function syncYoutubeContentScripts(state: YoutubeEnhancerState): Promise<void> {
  const scripts = buildYoutubeContentScripts(state)
  try {
    await reconcileContentScripts(OWNED_SCRIPT_IDS, scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}

export async function injectYoutubeIntoOpenTabs(state: YoutubeEnhancerState): Promise<void> {
  if (!state.enabled) return
  const tabs = await chrome.tabs.query({ url: ['*://*.youtube.com/*', '*://youtube.com/*'] })
  for (const tab of tabs) {
    if (tab.id == null) continue
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: false }, files: [SITE_FILES.isolatedJs] })
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: [SITE_FILES.mainJs],
        world: 'MAIN',
      })
    } catch {
      /* tab may not allow injection */
    }
  }
}
