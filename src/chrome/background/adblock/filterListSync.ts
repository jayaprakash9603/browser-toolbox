import { FILTER_LIST_REFRESH_ALARM } from '@/core/adblock/constants'
import { applySupplementalRules } from '@/core/adblock/filterLists/apply'
import { fetchListText, readCachedList, writeCachedList } from '@/core/adblock/filterLists/cache'
import { FILTER_LIST_SOURCES } from '@/core/adblock/filterLists/subscriptions'
import { createLogger } from '@/core/logging'
import { getAdblockState, updateAdblockState } from '@/core/adblock/adblockService'
import { getAdblockRuntimeProfile } from '@/platform/adblock/runtime'
import type { AdblockState, FilterListSubscriptionMeta } from '@/core/adblock/types'

const logger = createLogger('adblock-lists')
const REFRESH_PERIOD_MINUTES = 7 * 24 * 60

function defaultSubscriptions(state: AdblockState): Record<string, FilterListSubscriptionMeta> {
  const base = { ...state.subscriptions }
  for (const source of FILTER_LIST_SOURCES) {
    base[source.id] ??= { enabled: source.defaultEnabled }
  }
  return base
}

function listEnabled(state: AdblockState, sourceId: string, ruleset: string): boolean {
  const subscriptions = defaultSubscriptions(state)
  if (subscriptions[sourceId]?.enabled === false) return false
  if (ruleset === 'annoyances') return state.cookieBanners
  if (ruleset === 'privacy') return state.lists.privacy
  return state.lists.ads
}

export async function refreshFilterLists(manual = false): Promise<AdblockState> {
  const state = await getAdblockState()
  if (!state.enabled) return state

  const subscriptions = defaultSubscriptions(state)
  const lineSets: string[][] = []
  let fetchErrors = 0

  for (const source of FILTER_LIST_SOURCES) {
    if (!listEnabled(state, source.id, source.ruleset)) continue
    try {
      const text = await fetchListText(source.url)
      await writeCachedList(source.id, text)
      subscriptions[source.id] = {
        ...subscriptions[source.id],
        enabled: subscriptions[source.id]?.enabled ?? source.defaultEnabled,
        lastUpdated: Date.now(),
        lastError: undefined,
      }
      lineSets.push(text.split('\n'))
    } catch (error) {
      fetchErrors++
      const cached = await readCachedList(source.id)
      if (cached?.text) {
        lineSets.push(cached.text.split('\n'))
        subscriptions[source.id] = {
          ...subscriptions[source.id],
          lastError: error instanceof Error ? error.message : String(error),
        }
      } else {
        subscriptions[source.id] = {
          ...subscriptions[source.id],
          lastError: error instanceof Error ? error.message : String(error),
        }
      }
    }
  }

  const budget = getAdblockRuntimeProfile().dynamicRuleBudget
  let syncMeta = state.subscriptionSync ?? {}
  try {
    const result = await applySupplementalRules(lineSets, budget)
    syncMeta = {
      lastRefreshAt: Date.now(),
      dynamicRulesApplied: result.applied,
      supplementalDomains: result.domains,
      unsupportedRules: result.unsupported,
      lastRefreshError: fetchErrors && !lineSets.length ? 'All downloads failed' : undefined,
    }
    if (manual) logger.info('filter lists refreshed', result)
  } catch (error) {
    syncMeta = {
      ...syncMeta,
      lastRefreshAt: Date.now(),
      lastRefreshError: error instanceof Error ? error.message : String(error),
    }
    logger.warn('supplemental rules apply failed', error)
  }

  return updateAdblockState({ subscriptions, subscriptionSync: syncMeta })
}

export function registerFilterListAlarms(): void {
  if (!chrome.alarms) return
  void chrome.alarms.create(FILTER_LIST_REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== FILTER_LIST_REFRESH_ALARM) return
    void refreshFilterLists()
  })
}
