import {
  emptyTotals,
  getAdblockTabStats,
  getAdblockTotals,
  hostnameFromUrl,
  RULESET_PATHS,
  RULESET_MANIFEST_IDS,
  setAdblockTabStats,
  type AdblockCounts,
  type AdblockTabEntry,
  type AdblockTotals,
  type RulesetId,
} from '@/core/adblock'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'
import { set } from '@/core/storage'

const logger = createLogger('adblock-stats')

const FLUSH_DELAY_MS = 400

const tabStats = new Map<number, AdblockTabEntry>()
let totals: AdblockTotals = emptyTotals()
let loadPromise: Promise<void> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let allowRuleIds: Map<string, Set<number>> | null = null

function ensureLoaded(): Promise<void> {
  loadPromise ??= (async () => {
    const [stored, storedTotals] = await Promise.all([getAdblockTabStats(), getAdblockTotals()])
    for (const entry of Object.values(stored)) tabStats.set(entry.tabId, entry)
    totals = storedTotals
  })().catch((error) => logger.warn('load stats failed', error))
  return loadPromise
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    const map = Object.fromEntries([...tabStats].map(([id, entry]) => [String(id), entry]))
    void Promise.all([setAdblockTabStats(map), set(STORAGE_KEYS.adblockTotals, totals)]).catch(
      (error) => logger.warn('flush stats failed', error),
    )
  }, FLUSH_DELAY_MS)
}

function blankEntry(tabId: number, url = '', title = '', favIconUrl?: string): AdblockTabEntry {
  return {
    tabId,
    url,
    host: hostnameFromUrl(url) ?? '',
    title,
    favIconUrl,
    network: 0,
    hidden: 0,
    youtube: 0,
    updatedAt: Date.now(),
  }
}

async function entryFor(tabId: number): Promise<AdblockTabEntry> {
  const existing = tabStats.get(tabId)
  if (existing) return existing
  let entry = blankEntry(tabId)
  try {
    const tab = await chrome.tabs.get(tabId)
    entry = blankEntry(tabId, tab.url ?? '', tab.title ?? '', tab.favIconUrl)
  } catch {
    /* tab already closed */
  }
  tabStats.set(tabId, entry)
  return entry
}

export async function recordTabDelta(tabId: number, delta: Partial<AdblockCounts>): Promise<void> {
  if (tabId < 0) return
  await ensureLoaded()
  const entry = await entryFor(tabId)
  for (const key of ['network', 'hidden', 'youtube'] as const) {
    const amount = Math.max(0, Math.floor(delta[key] ?? 0))
    if (!amount) continue
    entry[key] += amount
    totals[key] += amount
  }
  entry.updatedAt = Date.now()
  scheduleFlush()
}

export async function resetTab(tabId: number, url: string, title = '', favIconUrl?: string) {
  await ensureLoaded()
  tabStats.set(tabId, blankEntry(tabId, url, title, favIconUrl))
  scheduleFlush()
}

export async function updateTabMeta(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
  await ensureLoaded()
  const entry = tabStats.get(tabId)
  if (!entry) return
  if (tab.url) {
    entry.url = tab.url
    entry.host = hostnameFromUrl(tab.url) ?? entry.host
  }
  if (tab.title) entry.title = tab.title
  if (tab.favIconUrl) entry.favIconUrl = tab.favIconUrl
  scheduleFlush()
}

export async function removeTab(tabId: number): Promise<void> {
  await ensureLoaded()
  if (tabStats.delete(tabId)) scheduleFlush()
}

export async function resetTotals(): Promise<void> {
  await ensureLoaded()
  totals = emptyTotals()
  scheduleFlush()
}

async function loadAllowRuleIds(): Promise<Map<string, Set<number>>> {
  if (allowRuleIds) return allowRuleIds
  const map = new Map<string, Set<number>>()
  await Promise.all(
    (Object.keys(RULESET_PATHS) as RulesetId[]).map(async (id) => {
      try {
        const res = await fetch(chrome.runtime.getURL(RULESET_PATHS[id]))
        const rules = (await res.json()) as chrome.declarativeNetRequest.Rule[]
        map.set(
          RULESET_MANIFEST_IDS[id],
          new Set(rules.filter((rule) => rule.action.type !== 'block').map((rule) => rule.id)),
        )
      } catch {
        map.set(RULESET_MANIFEST_IDS[id], new Set())
      }
    }),
  )
  allowRuleIds = map
  return map
}

async function isBlockingMatch(rulesetId: string, ruleId: number): Promise<boolean> {
  if (rulesetId === chrome.declarativeNetRequest.DYNAMIC_RULESET_ID || rulesetId === '_dynamic') {
    return false
  }
  const allow = await loadAllowRuleIds()
  return !allow.get(rulesetId)?.has(ruleId)
}

/** Live per-request counting; Chrome only exposes this event to unpacked extensions. */
export function startNetworkCounter(): boolean {
  const event = chrome.declarativeNetRequest.onRuleMatchedDebug
  if (!event) return false
  event.addListener((info) => {
    const tabId = info.request.tabId
    if (tabId < 0) return
    void isBlockingMatch(info.rule.rulesetId, info.rule.ruleId).then((blocked) => {
      if (blocked) void recordTabDelta(tabId, { network: 1 })
    })
  })
  return true
}

/** Fallback for packed builds: reconcile with Chrome's matched-rule log for one tab. */
export async function reconcileNetworkCount(tabId: number): Promise<void> {
  try {
    const matched = await chrome.declarativeNetRequest.getMatchedRules({ tabId })
    const infos = matched.rulesMatchedInfo ?? []
    let blocked = 0
    for (const info of infos) {
      if (await isBlockingMatch(info.rule.rulesetId, info.rule.ruleId)) blocked++
    }
    await ensureLoaded()
    const entry = await entryFor(tabId)
    if (blocked > entry.network) await recordTabDelta(tabId, { network: blocked - entry.network })
  } catch (error) {
    logger.debug('getMatchedRules unavailable', error)
  }
}

export async function getTabEntry(tabId: number): Promise<AdblockTabEntry> {
  await ensureLoaded()
  return entryFor(tabId)
}

export async function configureBadge(enabled: boolean): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' })
    await chrome.declarativeNetRequest.setExtensionActionOptions({
      displayActionCountAsBadgeText: enabled,
    })
    if (!enabled) await chrome.action.setBadgeText({ text: '' })
  } catch (error) {
    logger.debug('badge config', error)
  }
}
