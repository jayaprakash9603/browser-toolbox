import {
  allowSite,
  getProtectionState,
  isTrustedHost,
  openedTabRecord,
  recordProtectionBlock,
  shouldBlockOpenedTabNavigation,
  siteOfUrl,
  type OpenedTabRecord,
} from '@/core/protection'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-opened-tabs')
const SESSION_KEY = 'protectionOpenedTabs'

let records: Map<number, OpenedTabRecord> | null = null
const lastGestureByTab = new Map<number, number>()

async function load(): Promise<Map<number, OpenedTabRecord>> {
  if (records) return records
  const stored = await chrome.storage.session.get(SESSION_KEY)
  const raw = (stored[SESSION_KEY] ?? {}) as Record<string, OpenedTabRecord>
  records = new Map(Object.entries(raw).map(([id, record]) => [Number(id), record]))
  return records
}

async function save(): Promise<void> {
  if (!records) return
  await chrome.storage.session.set({ [SESSION_KEY]: Object.fromEntries(records) })
}

export function recordTabGesture(tabId: number | undefined): void {
  if (tabId != null) lastGestureByTab.set(tabId, Date.now())
}

/** The user chose "Continue" on the redirect interstitial in this tab. */
export async function allowOpenedTabSite(tabId: number | undefined, url: string): Promise<void> {
  if (tabId == null) return
  const map = await load()
  const record = map.get(tabId)
  if (!record) return
  map.set(tabId, allowSite(record, url))
  await save()
}

async function onCreated(details: chrome.webNavigation.WebNavigationSourceCallbackDetails): Promise<void> {
  const state = await getProtectionState()
  if (!state.enabled || !state.openedTabGuard) return
  const opener = await chrome.tabs.get(details.sourceTabId).catch(() => null)
  const record = openedTabRecord(opener?.url, details.url)
  if (!record) return
  const map = await load()
  map.set(details.tabId, record)
  await save()
}

function blockedUrl(opener: string, target: string): string {
  const query = new URLSearchParams({ mode: 'redirect', opener })
  return chrome.runtime.getURL(`blocked.html?${query}#${target}`)
}

async function onCommitted(details: chrome.webNavigation.WebNavigationTransitionCallbackDetails): Promise<void> {
  if (details.frameId !== 0) return
  const map = await load()
  const record = map.get(details.tabId)
  if (!record || !siteOfUrl(details.url)) return
  const state = await getProtectionState()
  if (!state.enabled || !state.openedTabGuard) return

  const block = shouldBlockOpenedTabNavigation({
    record,
    url: details.url,
    transitionType: details.transitionType,
    transitionQualifiers: details.transitionQualifiers,
    lastGestureAt: lastGestureByTab.get(details.tabId) ?? 0,
    now: Date.now(),
    isTrusted: (url) => isTrustedHost(state.trusted, url),
  })
  if (!block) {
    const next = allowSite(record, details.url)
    if (next !== record) {
      map.set(details.tabId, next)
      await save()
    }
    return
  }
  logger.debug('blocked opened-tab redirect', { tabId: details.tabId, url: details.url })
  await chrome.tabs.update(details.tabId, { url: blockedUrl(record.openerSite, details.url) })
  await recordProtectionBlock('redirect', siteOfUrl(details.url) ?? 'unknown')
}

async function forget(tabId: number): Promise<void> {
  lastGestureByTab.delete(tabId)
  const map = await load()
  if (map.delete(tabId)) await save()
}

export function registerOpenedTabGuard(): void {
  if (!chrome.webNavigation?.onCreatedNavigationTarget) return
  const guard = (task: Promise<void>) => task.catch((error) => logger.warn('opened-tab guard failed', error))
  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => void guard(onCreated(details)))
  chrome.webNavigation.onCommitted.addListener((details) => void guard(onCommitted(details)))
  chrome.tabs.onRemoved.addListener((tabId) => void guard(forget(tabId)))
  chrome.tabs.onReplaced.addListener((added, removed) => {
    void guard(
      load().then(async (map) => {
        const record = map.get(removed)
        if (!record) return
        map.delete(removed)
        map.set(added, record)
        await save()
      }),
    )
  })
}
