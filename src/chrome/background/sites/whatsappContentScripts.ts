import {
  CONTENT_SCRIPT_IDS,
  SITE_FILES,
  WHATSAPP_MATCHES,
  type WhatsappPlusState,
} from '@/core/sites/whatsapp'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('sites-whatsapp-scripts')
const OWNED_SCRIPT_IDS = Object.values(CONTENT_SCRIPT_IDS)

export function buildWhatsappContentScripts(state: WhatsappPlusState): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  return [
    {
      id: CONTENT_SCRIPT_IDS.isolated,
      js: [SITE_FILES.isolatedJs],
      matches: [...WHATSAPP_MATCHES],
      runAt: 'document_start',
      allFrames: false,
    },
    {
      id: CONTENT_SCRIPT_IDS.main,
      js: [SITE_FILES.waVendorJs, SITE_FILES.mainJs],
      matches: [...WHATSAPP_MATCHES],
      runAt: 'document_start',
      allFrames: false,
      world: 'MAIN',
    },
  ]
}

export async function syncWhatsappContentScripts(state: WhatsappPlusState): Promise<void> {
  const scripts = buildWhatsappContentScripts(state)
  try {
    await reconcileContentScripts(OWNED_SCRIPT_IDS, scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}

export async function injectWhatsappIntoOpenTabs(state: WhatsappPlusState): Promise<void> {
  if (!state.enabled) return
  const tabs = await chrome.tabs.query({ url: ['*://web.whatsapp.com/*'] })
  for (const tab of tabs) {
    if (tab.id == null) continue
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: [SITE_FILES.isolatedJs],
      })
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: false },
        files: [SITE_FILES.waVendorJs, SITE_FILES.mainJs],
        world: 'MAIN',
      })
    } catch {
      /* tab may not allow injection */
    }
  }
}
