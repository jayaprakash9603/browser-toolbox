import { CONTENT_SCRIPT_IDS, PROTECTION_FILES, type ProtectionState } from '@/core/protection'
import { createLogger } from '@/core/logging'

import { reconcileContentScripts } from '../scriptRegistry'

const logger = createLogger('protection-scripts')
const OWNED_SCRIPT_IDS = Object.values(CONTENT_SCRIPT_IDS)

const ALL_URLS = ['<all_urls>']

function trustedExcludePatterns(trusted: string[]): string[] | undefined {
  if (!trusted.length) return undefined
  return trusted.flatMap((host) => [`*://${host}/*`, `*://*.${host}/*`])
}

/**
 * The isolated script always runs while protection is on: it relays guard signals and
 * gestures and reads the per-feature toggles itself. Page-world guards are only injected for
 * the features that are switched on.
 */
export function buildProtectionContentScripts(
  state: ProtectionState,
): chrome.scripting.RegisteredContentScript[] {
  if (!state.enabled) return []
  const excludeMatches = trustedExcludePatterns(state.trusted)
  const base = { matches: ALL_URLS, excludeMatches, runAt: 'document_start' as const }
  const scripts: chrome.scripting.RegisteredContentScript[] = [
    { ...base, id: CONTENT_SCRIPT_IDS.heuristics, js: [PROTECTION_FILES.heuristicsJs], allFrames: true },
  ]
  if (state.scamGuard) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.scamGuard,
      js: [PROTECTION_FILES.scamGuardJs],
      allFrames: false,
      world: 'MAIN',
    })
  }
  if (state.clipboardGuard) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.clipboardGuard,
      js: [PROTECTION_FILES.clipboardGuardJs],
      allFrames: true,
      world: 'MAIN',
    })
  }
  if (state.notificationGuard) {
    scripts.push({
      ...base,
      id: CONTENT_SCRIPT_IDS.notificationGuard,
      js: [PROTECTION_FILES.notificationGuardJs],
      allFrames: false,
      world: 'MAIN',
    })
  }
  return scripts
}

export async function syncProtectionContentScripts(state: ProtectionState): Promise<void> {
  const scripts = buildProtectionContentScripts(state)
  try {
    await reconcileContentScripts(OWNED_SCRIPT_IDS, scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}
