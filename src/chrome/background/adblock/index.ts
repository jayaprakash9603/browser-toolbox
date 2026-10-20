import { getAdblockState, isBlockingActiveForUrl } from '@/core/adblock'
import { STORAGE_KEYS } from '@/core/constants'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'

import { syncAllowlistRules } from './allowlist'
import { injectIntoOpenTabs, injectYoutubeOpenTabs, syncContentScripts } from './contentScripts'
import { syncStaticRulesets } from './rulesets'
import {
  configureBadge,
  getTabEntry,
  reconcileNetworkCount,
  recordTabDelta,
  removeTab,
  resetTab,
  resetTotals,
  startNetworkCounter,
  updateTabMeta,
} from './stats'

const logger = createLogger('adblock')

let syncQueue: Promise<void> = Promise.resolve()
let liveCounting = false

export function syncAdblockState(): Promise<void> {
  syncQueue = syncQueue
    .then(async () => {
      const state = await getAdblockState()
      await syncStaticRulesets(state)
      await syncAllowlistRules(state.allowlist)
      await syncContentScripts(state)
      await configureBadge(state.enabled)
      await injectIntoOpenTabs(state)
      await injectYoutubeOpenTabs(state)
      logger.debug('synced', { enabled: state.enabled })
    })
    .catch((error) => logger.warn('sync failed', error))
  return syncQueue
}

async function resolveTabId(tabId?: number): Promise<number> {
  if (tabId != null) return tabId
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (active?.id == null) throw new Error('No active tab')
  return active.id
}

function registerTabTracking(): void {
  chrome.tabs.onUpdated?.addListener((tabId, info, tab) => {
    if (info.status === 'loading' && info.url) {
      void resetTab(tabId, info.url, tab.title ?? '', tab.favIconUrl)
      return
    }
    if (info.title || info.favIconUrl || info.url) void updateTabMeta(tabId, tab)
    if (info.status === 'complete' && !liveCounting) void reconcileNetworkCount(tabId)
  })
  chrome.tabs.onRemoved?.addListener((tabId) => void removeTab(tabId))
  chrome.tabs.onActivated?.addListener(({ tabId }) => {
    if (!liveCounting) void reconcileNetworkCount(tabId)
  })
}

export function registerAdblock(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.adblock]) void syncAdblockState()
  })

  liveCounting = startNetworkCounter()
  registerTabTracking()

  registerMessageHandler('ADBLOCK_COSMETIC_REPORT', async (message, sender) => {
    if (message.type !== 'ADBLOCK_COSMETIC_REPORT' || sender.tab?.id == null) return null
    await recordTabDelta(sender.tab.id, { hidden: message.hidden, youtube: message.youtube })
    return null
  })

  registerMessageHandler('ADBLOCK_GET_TAB_STATS', async (message) => {
    const requested = message.type === 'ADBLOCK_GET_TAB_STATS' ? message.tabId : undefined
    const tabId = await resolveTabId(requested)
    if (!liveCounting) await reconcileNetworkCount(tabId)
    const [entry, state, tab] = await Promise.all([
      getTabEntry(tabId),
      getAdblockState(),
      chrome.tabs.get(tabId).catch(() => null),
    ])
    const url = tab?.url ?? entry.url
    return { ...entry, url, active: isBlockingActiveForUrl(state, url) }
  })

  registerMessageHandler('ADBLOCK_RELOAD_TAB', async (message) => {
    const requested = message.type === 'ADBLOCK_RELOAD_TAB' ? message.tabId : undefined
    const tabId = await resolveTabId(requested)
    await chrome.tabs.reload(tabId)
    return { reloaded: true }
  })

  registerMessageHandler('ADBLOCK_RESET_TOTALS', async () => {
    await resetTotals()
    return { reset: true }
  })

  void syncAdblockState()
}
