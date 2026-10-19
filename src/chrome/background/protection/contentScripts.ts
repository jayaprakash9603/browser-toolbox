import { CONTENT_SCRIPT_IDS, PROTECTION_FILES, type ProtectionState } from '@/core/protection'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-scripts')

const ALL_URLS = ['<all_urls>']

export function buildProtectionContentScripts(state: ProtectionState): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled || !state.lookalike) return []
  return [
    {
      id: CONTENT_SCRIPT_IDS.heuristics,
      js: [PROTECTION_FILES.heuristicsJs],
      matches: ALL_URLS,
      runAt: 'document_idle',
      allFrames: false,
    },
  ]
}

async function unregisterHeuristics(): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_IDS.heuristics] })
  } catch {
    /* not registered */
  }
}

export async function syncProtectionContentScripts(state: ProtectionState): Promise<void> {
  await unregisterHeuristics()
  const scripts = buildProtectionContentScripts(state)
  if (!scripts.length) return
  try {
    await chrome.scripting.registerContentScripts(scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}
