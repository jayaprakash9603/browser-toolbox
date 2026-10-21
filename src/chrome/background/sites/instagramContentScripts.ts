import {
  CONTENT_SCRIPT_IDS,
  INSTAGRAM_MATCHES,
  SITE_FILES,
  type InstagramEnhancerState,
} from '@/core/sites/instagram'
import { createLogger } from '@/core/logging'

const logger = createLogger('sites-instagram-scripts')

export function buildInstagramContentScripts(state: InstagramEnhancerState): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  return [
    {
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [SITE_FILES.isolatedJs],
      matches: [...INSTAGRAM_MATCHES],
      runAt: 'document_idle',
      allFrames: false,
    },
  ]
}

async function unregister(): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_IDS.isolated] })
  } catch {
    /* not registered */
  }
}

export async function syncInstagramContentScripts(state: InstagramEnhancerState): Promise<void> {
  await unregister()
  const scripts = buildInstagramContentScripts(state)
  if (!scripts.length) return
  try {
    await chrome.scripting.registerContentScripts(scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}

export async function injectInstagramIntoOpenTabs(state: InstagramEnhancerState): Promise<void> {
  if (!state.enabled) return
  const tabs = await chrome.tabs.query({ url: ['*://*.instagram.com/*', '*://instagram.com/*'] })
  for (const tab of tabs) {
    if (tab.id == null) continue
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: [SITE_FILES.isolatedJs],
      })
    } catch {
      /* tab may not allow injection */
    }
  }
}
