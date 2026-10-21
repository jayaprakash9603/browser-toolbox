import {
  CONTENT_SCRIPT_IDS,
  INSTAGRAM_MATCHES,
  SITE_FILES,
  type InstagramEnhancerState,
} from '@/core/sites/instagram'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('sites-instagram-scripts')
const OWNED_SCRIPT_IDS = [CONTENT_SCRIPT_IDS.isolated]

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

export async function syncInstagramContentScripts(state: InstagramEnhancerState): Promise<void> {
  const scripts = buildInstagramContentScripts(state)
  try {
    await reconcileContentScripts(OWNED_SCRIPT_IDS, scripts)
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
