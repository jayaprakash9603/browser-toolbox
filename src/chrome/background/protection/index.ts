import {
  addTrustedHost,
  getProtectionState,
  getProtectionStats,
  recordProtectionBlock,
  resetProtectionStats,
  type ThreatCategory,
} from '@/core/protection'
import { STORAGE_KEYS } from '@/core/constants'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

import { syncProtectionContentScripts } from './contentScripts'
import { decideDownload, recordGesture, registerDownloadGuard } from './downloads'
import { allowOpenedTabSite, recordTabGesture, registerOpenedTabGuard } from './openedTabs'
import { invalidateThreatsCache, syncProtectionRules } from './rules'
import { allowProceedOnce } from './trusted'

const logger = createLogger('protection')

let syncQueue: Promise<void> = Promise.resolve()

export function syncProtectionState(): Promise<void> {
  syncQueue = syncQueue
    .then(async () => {
      invalidateThreatsCache()
      const state = await getProtectionState()
      await syncProtectionRules(state)
      await syncProtectionContentScripts(state)
      logger.debug('synced', { enabled: state.enabled })
    })
    .catch((error) => logger.warn('sync failed', error))
  return syncQueue
}

export function registerProtection(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.protection]) void syncProtectionState()
  })

  registerMessageHandler('PROTECTION_REPORT', async (message) => {
    if (message.type !== 'PROTECTION_REPORT') return null
    const category = message.category as ThreatCategory
    const host = message.host
    if (!category || !host) return null
    const stats = await recordProtectionBlock(category, host)
    return stats
  })

  registerMessageHandler('PROTECTION_GET_STATS', async () => getProtectionStats())

  registerMessageHandler('PROTECTION_PROCEED_ONCE', async (message) => {
    if (message.type !== 'PROTECTION_PROCEED_ONCE' || !message.url) return null
    await allowProceedOnce(message.url)
    return { ok: true }
  })

  registerMessageHandler('PROTECTION_TRUST_SITE', async (message) => {
    if (message.type !== 'PROTECTION_TRUST_SITE' || !message.host) return null
    await addTrustedHost(message.host)
    await syncProtectionState()
    return { ok: true }
  })

  registerMessageHandler('PROTECTION_RESET_STATS', async () => {
    await resetProtectionStats()
    return { reset: true }
  })

  registerMessageHandler('PROTECTION_GESTURE', (_message, sender) => {
    // trust the sender's real URL, not the host claimed in the message
    recordGesture([sender.url, sender.tab?.url])
    recordTabGesture(sender.tab?.id)
    return null
  })

  registerMessageHandler('PROTECTION_ALLOW_OPENED_TAB', async (message, sender) => {
    if (message.type !== 'PROTECTION_ALLOW_OPENED_TAB') return null
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return null
    await allowOpenedTabSite(sender.tab?.id, message.url)
    return { ok: true }
  })

  registerMessageHandler('PROTECTION_DOWNLOAD_DECISION', async (message, sender) => {
    if (message.type !== 'PROTECTION_DOWNLOAD_DECISION') return null
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return null
    await decideDownload(message.id, message.keep)
    return { ok: true }
  })

  registerDownloadGuard()
  registerOpenedTabGuard()
  void syncProtectionState()
}
