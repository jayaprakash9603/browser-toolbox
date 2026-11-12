import {
  buildLogEntry,
  classifyRedirect,
  getProtectionState,
  hostOfHttpUrl,
  isExtensionOrAboutUrl,
  isTrustedHost,
  mergeWorkflowPolicies,
  openedTabRecord,
  recordProtectionBlock,
  shouldBlockOpenedTabNavigation,
  siteOfUrl,
  type OpenedTabRecord,
  type RedirectContext,
} from '@/core/protection'
import { threatCategoryForHost } from '@/chrome/background/protection/rules'
import { createLogger } from '@/core/logging'

import {
  appendRedirectLogEntry,
  gestureAt,
  getRedirectSession,
  metaRefreshSignal,
  noteRedirectHop,
  openerTabId,
  persistSessionAfterVerdict,
  setOpenerTab,
} from './redirectStore'

const logger = createLogger('protection-opened-tabs')
const SESSION_KEY = 'protectionOpenedTabs'

let records: Map<number, OpenedTabRecord> | null = null

async function loadOpenedRecords(): Promise<Map<number, OpenedTabRecord>> {
  if (records) return records
  const stored = await chrome.storage.session.get(SESSION_KEY)
  const raw = (stored[SESSION_KEY] ?? {}) as Record<string, OpenedTabRecord>
  records = new Map(Object.entries(raw).map(([id, record]) => [Number(id), record]))
  return records
}

async function saveOpenedRecords(): Promise<void> {
  if (!records) return
  await chrome.storage.session.set({ [SESSION_KEY]: Object.fromEntries(records) })
}

function blockedUrl(params: {
  opener: string
  target: string
  risk: string
  classification: string
  reason: string
  logId: string
}): string {
  const query = new URLSearchParams({
    mode: 'redirect',
    opener: params.opener,
    risk: params.risk,
    classification: params.classification,
    reason: params.reason,
    logId: params.logId,
  })
  return chrome.runtime.getURL(`blocked.html?${query}#${params.target}`)
}

async function buildContext(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
  record: OpenedTabRecord | null,
  sourceUrl: string | undefined,
): Promise<RedirectContext | null> {
  const state = await getProtectionState()
  if (!state.enabled) return null
  const destUrl = details.url
  if (isExtensionOrAboutUrl(destUrl)) return null
  const destSite = siteOfUrl(destUrl)
  if (!destSite) return null
  const now = Date.now()
  const openerId = await openerTabId(details.tabId)
  const tabGesture = await gestureAt(details.tabId)
  const openerGesture = openerId != null ? await gestureAt(openerId) : 0
  let openerHost: string | null = null
  if (openerId != null) {
    try {
      const openerTab = await chrome.tabs.get(openerId)
      openerHost = hostOfHttpUrl(openerTab.url ?? undefined)
    } catch {
      openerHost = null
    }
  }
  const destHost = hostOfHttpUrl(destUrl)
  const threat = destHost ? await threatCategoryForHost(destHost) : null
  const hopCount = await noteRedirectHop(details.tabId, now)
  const session = await getRedirectSession(details.tabId)
  const policies = mergeWorkflowPolicies(state.workflowHosts)

  return {
    sourceUrl,
    destUrl,
    sourceHost: hostOfHttpUrl(sourceUrl),
    destHost,
    sourceSite: siteOfUrl(sourceUrl),
    destSite,
    initiatingSite: record?.openerSite ?? siteOfUrl(sourceUrl),
    initiatingHost: openerHost ?? hostOfHttpUrl(sourceUrl),
    tabId: details.tabId,
    openerTabId: openerId,
    transitionType: details.transitionType,
    transitionQualifiers: details.transitionQualifiers,
    metaRefresh: await metaRefreshSignal(details.tabId),
    lastGestureTabAt: tabGesture,
    lastGestureOpenerAt: openerGesture,
    now,
    session,
    recentHopCount: hopCount,
    destThreatCategory: threat,
    isTrustedDest: isTrustedHost(state.trusted, destUrl),
    isOpenedTab: record != null,
    workflowHosts: policies,
    settings: state.redirectProtection,
  }
}

async function onCreated(details: chrome.webNavigation.WebNavigationSourceCallbackDetails): Promise<void> {
  const state = await getProtectionState()
  if (!state.enabled || !state.openedTabGuard) return
  const opener = await chrome.tabs.get(details.sourceTabId).catch(() => null)
  const record = openedTabRecord(opener?.url, details.url)
  if (!record) return
  const map = await loadOpenedRecords()
  map.set(details.tabId, record)
  await saveOpenedRecords()
  await setOpenerTab(details.tabId, details.sourceTabId)
}

async function onCommitted(details: chrome.webNavigation.WebNavigationTransitionCallbackDetails): Promise<void> {
  if (details.frameId !== 0) return
  if (isExtensionOrAboutUrl(details.url)) return

  const state = await getProtectionState()
  if (!state.enabled) return

  const map = await loadOpenedRecords()
  const record = map.get(details.tabId) ?? null
  const smart = state.redirectProtection.enabled
  const watchOpened = state.openedTabGuard

  if (!smart && !watchOpened) return
  if (!smart && !record) return

  let sourceUrl: string | undefined
  try {
    const tab = await chrome.tabs.get(details.tabId)
    sourceUrl = tab.url && tab.url !== details.url ? tab.url : undefined
  } catch {
    sourceUrl = undefined
  }

  if (smart) {
    const ctx = await buildContext(details, record, sourceUrl)
    if (!ctx) {
      if (!watchOpened || !record) return
    } else {
    const verdict = classifyRedirect(ctx)
    const logEntry = buildLogEntry(
      {
        sourceUrl: ctx.sourceUrl,
        destUrl: ctx.destUrl,
        transitionType: ctx.transitionType,
        tabId: details.tabId,
        at: ctx.now,
      },
      verdict,
    )
    await appendRedirectLogEntry(logEntry)
    await persistSessionAfterVerdict(
      details.tabId,
      ctx.openerTabId,
      ctx.session,
      verdict,
      ctx.destHost ?? '',
      ctx.now,
      state.redirectProtection.sessionTtlMs,
    )

    if (verdict.action === 'allow') return

    if (verdict.action === 'warn' || verdict.action === 'block') {
      const opener = record?.openerSite ?? ctx.initiatingSite ?? 'unknown'
      logger.debug('smart redirect interrupt', { tabId: details.tabId, action: verdict.action })
      await chrome.tabs.update(details.tabId, {
        url: blockedUrl({
          opener,
          target: details.url,
          risk: verdict.risk,
          classification: verdict.classification,
          reason: verdict.reasons[0] ?? verdict.classification,
          logId: logEntry.id,
        }),
      })
      if (verdict.action === 'block') {
        await recordProtectionBlock('redirect', ctx.destHost ?? 'unknown')
      }
    }
    return
    }
  }

  if (!watchOpened || !record || !siteOfUrl(details.url)) return

  const legacyGesture = await gestureAt(details.tabId)
  const block = shouldBlockOpenedTabNavigation({
    record,
    url: details.url,
    transitionType: details.transitionType,
    transitionQualifiers: details.transitionQualifiers,
    lastGestureAt: legacyGesture,
    now: Date.now(),
    isTrusted: (url) => isTrustedHost(state.trusted, url),
  })
  if (block) {
    const query = new URLSearchParams({ mode: 'redirect', opener: record.openerSite })
    await chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL(`blocked.html?${query}#${details.url}`),
    })
    await recordProtectionBlock('redirect', siteOfUrl(details.url) ?? 'unknown')
  }
}

async function forget(tabId: number): Promise<void> {
  const map = await loadOpenedRecords()
  if (map.delete(tabId)) await saveOpenedRecords()
  const { clearTabRedirectState } = await import('./redirectStore')
  await clearTabRedirectState(tabId)
}

export function registerOpenedTabGuard(): void {
  if (!chrome.webNavigation?.onCreatedNavigationTarget) return
  const guard = (task: Promise<void>) => task.catch((error) => logger.warn('opened-tab guard failed', error))
  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => void guard(onCreated(details)))
  chrome.webNavigation.onCommitted.addListener((details) => void guard(onCommitted(details)))
  chrome.tabs.onRemoved.addListener((tabId) => void guard(forget(tabId)))
  chrome.tabs.onReplaced.addListener((added, removed) => {
    void guard(
      (async () => {
        const map = await loadOpenedRecords()
        const record = map.get(removed)
        if (record) {
          map.delete(removed)
          map.set(added, record)
          await saveOpenedRecords()
        }
        const { replaceTabRedirectState } = await import('./redirectStore')
        await replaceTabRedirectState(removed, added)
      })(),
    )
  })
}

export async function allowOpenedTabSite(tabId: number | undefined, url: string): Promise<void> {
  if (tabId == null) return
  const state = await getProtectionState()
  const host = hostOfHttpUrl(url)
  if (!host) return
  if (state.redirectProtection.enabled) {
    const now = Date.now()
    const { createRedirectSession } = await import('@/core/protection/redirect/sessionLogic')
    const { setRedirectSession } = await import('./redirectStore')
    const session = createRedirectSession({
      tabId,
      initiatingHost: host,
      initiatingSite: siteOfUrl(url) ?? host,
      kind: 'payment',
      now,
      ttlMs: Math.min(state.redirectProtection.sessionTtlMs, 60_000),
      destHost: host,
    })
    await setRedirectSession(tabId, session)
    return
  }
  const map = await loadOpenedRecords()
  const record = map.get(tabId)
  if (!record) return
  const { allowSite } = await import('@/core/protection')
  map.set(tabId, allowSite(record, url))
  await saveOpenedRecords()
}

export function recordTabGesture(tabId: number | undefined): void {
  void import('./redirectStore').then(({ recordRedirectGesture }) => recordRedirectGesture(tabId))
}
