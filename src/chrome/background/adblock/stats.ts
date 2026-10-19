import {
  emptyTotals,
  getAdblockTabStats,
  getAdblockTotals,
  hostnameFromUrl,
  setAdblockTabStats,
  sumCounts,
  type AdblockCounts,
  type AdblockTabEntry,
  type AdblockTotals,
} from '@/core/adblock'
import { STORAGE_KEYS } from '@/core/constants'
import { createLogger } from '@/core/logging'
import { set } from '@/core/storage'

const logger = createLogger('adblock-stats')

const FLUSH_DELAY_MS = 1000

const tabStats = new Map<number, AdblockTabEntry>()
let totals: AdblockTotals = emptyTotals()
let loadPromise: Promise<void> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let dirty = false
let lastPersistedMapJson = ''
let lastPersistedTotalsJson = ''
let allowRuleIds: Map<string, Set<number>> | null = null

function ensureLoaded(): Promise<void> {
  loadPromise ??= (async () => {
    const [stored, storedTotals] = await Promise.all([getAdblockTabStats(), getAdblockTotals()])
    for (const entry of Object.values(stored)) tabStats.set(entry.tabId, entry)
    totals = storedTotals
  })().catch((error) => logger.warn('load stats failed', error))
  return loadPromise
}

function buildPersistMap(): Record<string, AdblockTabEntry> {
  return Object.fromEntries(
    [...tabStats]
      .filter(([, entry]) => sumCounts(entry) > 0)
      .map(([id, entry]) => [String(id), entry]),
  )
}

function scheduleFlush(): void {
  dirty = true
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (!dirty) return
    const map = buildPersistMap()
    const mapJson = JSON.stringify(map)
    const totalsJson = JSON.stringify(totals)
    if (mapJson === lastPersistedMapJson && totalsJson === lastPersistedTotalsJson) {
      dirty = false
      return
    }
    lastPersistedMapJson = mapJson
    lastPersistedTotalsJson = totalsJson
    dirty = false
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
  let changed = false
  if (tab.url) {
    entry.url = tab.url
    entry.host = hostnameFromUrl(tab.url) ?? entry.host
    changed = true
  }
  if (tab.title) {
    entry.title = tab.title
    changed = true
  }
  if (tab.favIconUrl) {
    entry.favIconUrl = tab.favIconUrl
    changed = true
  }
  if (changed) scheduleFlush()
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
  try {
    const res = await fetch(chrome.runtime.getURL('adblock/allow-ids.json'))
    const data = (await res.json()) as Record<string, number[]>
    allowRuleIds = new Map(Object.entries(data).map(([id, ids]) => [id, new Set(ids)]))
  } catch (error) {
    logger.warn('allow-ids.json missing, network counts may be inflated', error)
    allowRuleIds = new Map()
  }
  return allowRuleIds
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
