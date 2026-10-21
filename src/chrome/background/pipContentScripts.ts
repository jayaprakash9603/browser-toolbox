import { PIP_AUTO_SCRIPT_ID } from '@/core/pip'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from './scriptRegistry'

const logger = createLogger('pip-scripts')

export const PIP_AUTO_JS = 'sites/scripts/pip-auto.js'

export function buildPipAutoContentScript(): chrome.scripting.RegisteredContentScript {
  return {
    id: PIP_AUTO_SCRIPT_ID,
    js: [PIP_AUTO_JS],
    matches: ['<all_urls>'],
    runAt: 'document_start',
    allFrames: true,
    world: 'MAIN',
  }
}

export async function syncPipAutoContentScript(enabled: boolean): Promise<void> {
  const scripts = enabled ? [buildPipAutoContentScript()] : []
  try {
    await reconcileContentScripts([PIP_AUTO_SCRIPT_ID], scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}
