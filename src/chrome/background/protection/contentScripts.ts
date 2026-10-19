import { CONTENT_SCRIPT_IDS, PROTECTION_FILES, type ProtectionState } from '@/core/protection'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-scripts')

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

async function unregisterAll(): Promise<void> {
  const ours = new Set<string>(Object.values(CONTENT_SCRIPT_IDS))
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts()
    const ids = registered.map((script) => script.id).filter((id) => ours.has(id))
    if (ids.length) await chrome.scripting.unregisterContentScripts({ ids })
  } catch {
    /* nothing registered */
  }
}

export async function syncProtectionContentScripts(state: ProtectionState): Promise<void> {
  await unregisterAll()
  const scripts = buildProtectionContentScripts(state)
  if (!scripts.length) return
  try {
    await chrome.scripting.registerContentScripts(scripts)
  } catch (error) {
    logger.warn('registerContentScripts failed', error)
  }
}
