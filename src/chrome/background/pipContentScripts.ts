import { PIP_AUTO_SCRIPT_ID } from '@/core/pip'
import { createLogger } from '@/core/logging'

const logger = createLogger('pip-scripts')

const PIP_AUTO_JS = 'sites/scripts/pip-auto.js'

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
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [PIP_AUTO_SCRIPT_ID] })
  } catch {
    /* not registered */
  }
  if (!enabled) return
  try {
    await chrome.scripting.registerContentScripts([buildPipAutoContentScript()])
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}
