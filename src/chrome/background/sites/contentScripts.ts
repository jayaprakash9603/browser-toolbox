import { CONTENT_SCRIPT_IDS, SITE_FILES, YOUTUBE_MATCHES, type YoutubeEnhancerState } from '@/core/sites/youtube'
import { createLogger } from '@/core/logging'

const logger = createLogger('sites-youtube-scripts')

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

async function unregister(): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: Object.values(CONTENT_SCRIPT_IDS) })
  } catch {
    /* not registered */
  }
}

export async function syncYoutubeContentScripts(state: YoutubeEnhancerState): Promise<void> {
  await unregister()
  const scripts = buildYoutubeContentScripts(state)
  if (!scripts.length) return
  try {
    await chrome.scripting.registerContentScripts(scripts)
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
