import {
  CONTENT_SCRIPT_IDS,
  INSTAGRAM_MATCHES,
  SITE_FILES,
  type InstagramEnhancerState,
} from '@/core/sites/instagram'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('sites-instagram-scripts')
const OWNED_SCRIPT_IDS = Object.values(CONTENT_SCRIPT_IDS)

export function buildInstagramContentScripts(state: InstagramEnhancerState): chrome.scripting.RegisteredContentScript[] {
  const matches = [...INSTAGRAM_MATCHES]
  const scripts: chrome.scripting.RegisteredContentScript[] = [
    {
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [SITE_FILES.isolatedJs],
      matches,
      runAt: 'document_start',
      allFrames: false,
    },
  ]
  // The page-world hook reads video URLs. Keep it off until the enhancer is enabled.
  if (state.enabled) {
    scripts.unshift({
      id: CONTENT_SCRIPT_IDS.main,
      js: [SITE_FILES.mainJs],
      matches,
      runAt: 'document_start',
      allFrames: false,
      world: 'MAIN',
    })
  }
  return scripts
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
  const tabs = await chrome.tabs.query({ url: ['*://*.instagram.com/*', '*://instagram.com/*'] })
  for (const tab of tabs) {
    if (tab.id == null) continue
    if (state.enabled) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: false },
          files: [SITE_FILES.mainJs],
          world: 'MAIN',
        })
      } catch {
        /* tab may not allow injection */
      }
    }
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
