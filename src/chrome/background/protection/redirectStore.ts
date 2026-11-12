import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { appendRedirectLog, type RedirectLogEntry, type RedirectSession } from '@/core/protection'
import { applyVerdictToSession } from '@/core/protection/redirect/sessionLogic'
import {
  GESTURE_SESSION_KEY,
  HOP_COUNT_SESSION_KEY,
  META_REFRESH_SESSION_KEY,
  REDIRECT_CHAIN_WINDOW_MS,
  SESSION_STORAGE_KEY,
} from '@/core/protection/redirect/constants'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-redirect')

type TabMap<T> = Record<string, T>

let gestures: TabMap<number> | null = null
let sessions: TabMap<RedirectSession> | null = null
let hopWindows: TabMap<{ count: number; started: number }> | null = null
let metaByTab: TabMap<boolean> | null = null
let openerByTab: TabMap<number> | null = null

async function loadGestures(): Promise<TabMap<number>> {
  if (gestures) return gestures
  const stored = await chrome.storage.session.get(GESTURE_SESSION_KEY)
  gestures = (stored[GESTURE_SESSION_KEY] as TabMap<number>) ?? {}
  return gestures
}

async function saveGestures(): Promise<void> {
  if (!gestures) return
  await chrome.storage.session.set({ [GESTURE_SESSION_KEY]: gestures })
}

async function loadSessions(): Promise<TabMap<RedirectSession>> {
  if (sessions) return sessions
  const stored = await chrome.storage.session.get(SESSION_STORAGE_KEY)
  sessions = (stored[SESSION_STORAGE_KEY] as TabMap<RedirectSession>) ?? {}
  return sessions
}

async function saveSessions(): Promise<void> {
  if (!sessions) return
  await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: sessions })
}

async function loadHops(): Promise<TabMap<{ count: number; started: number }>> {
  if (hopWindows) return hopWindows
  const stored = await chrome.storage.session.get(HOP_COUNT_SESSION_KEY)
  hopWindows = (stored[HOP_COUNT_SESSION_KEY] as TabMap<{ count: number; started: number }>) ?? {}
  return hopWindows
}

async function saveHops(): Promise<void> {
  if (!hopWindows) return
  await chrome.storage.session.set({ [HOP_COUNT_SESSION_KEY]: hopWindows })
}

async function loadMeta(): Promise<TabMap<boolean>> {
  if (metaByTab) return metaByTab
  const stored = await chrome.storage.session.get(META_REFRESH_SESSION_KEY)
  metaByTab = (stored[META_REFRESH_SESSION_KEY] as TabMap<boolean>) ?? {}
  return metaByTab
}

async function saveMeta(): Promise<void> {
  if (!metaByTab) return
  await chrome.storage.session.set({ [META_REFRESH_SESSION_KEY]: metaByTab })
}

export async function recordRedirectGesture(tabId: number | undefined, at = Date.now()): Promise<void> {
  if (tabId == null) return
  const map = await loadGestures()
  map[String(tabId)] = at
  await saveGestures()
}

export async function gestureAt(tabId: number | undefined): Promise<number> {
  if (tabId == null) return 0
  const map = await loadGestures()
  return map[String(tabId)] ?? 0
}

export async function setOpenerTab(tabId: number, openerTabId: number): Promise<void> {
  if (!openerByTab) openerByTab = {}
  openerByTab[String(tabId)] = openerTabId
}

export async function openerTabId(tabId: number): Promise<number | undefined> {
  return openerByTab?.[String(tabId)]
}

export async function clearTabRedirectState(tabId: number): Promise<void> {
  const key = String(tabId)
  const g = await loadGestures()
  const s = await loadSessions()
  const h = await loadHops()
  const m = await loadMeta()
  delete g[key]
  delete s[key]
  delete h[key]
  delete m[key]
  if (openerByTab) delete openerByTab[key]
  await Promise.all([saveGestures(), saveSessions(), saveHops(), saveMeta()])
}

export async function replaceTabRedirectState(removed: number, added: number): Promise<void> {
  const rKey = String(removed)
  const aKey = String(added)
  const s = await loadSessions()
  const session = s[rKey]
  if (session) {
    delete s[rKey]
    s[aKey] = { ...session, tabId: added }
    await saveSessions()
  }
  if (openerByTab?.[rKey] != null) {
    openerByTab[aKey] = openerByTab[rKey]
    delete openerByTab[rKey]
  }
  const g = await loadGestures()
  if (g[rKey] != null) {
    g[aKey] = g[rKey]
    delete g[rKey]
    await saveGestures()
  }
}

export async function getRedirectSession(tabId: number): Promise<RedirectSession | null> {
  const map = await loadSessions()
  const session = map[String(tabId)]
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    delete map[String(tabId)]
    await saveSessions()
    return null
  }
  return session
}

export async function setRedirectSession(tabId: number, session: RedirectSession | null): Promise<void> {
  const map = await loadSessions()
  const key = String(tabId)
  if (!session) delete map[key]
  else map[key] = session
  await saveSessions()
}

export async function noteRedirectHop(tabId: number, now: number): Promise<number> {
  const map = await loadHops()
  const key = String(tabId)
  const current = map[key]
  if (!current || now - current.started > REDIRECT_CHAIN_WINDOW_MS) {
    map[key] = { count: 1, started: now }
  } else {
    map[key] = { count: current.count + 1, started: current.started }
  }
  await saveHops()
  return map[key].count
}

export async function setMetaRefreshSignal(tabId: number, value: boolean): Promise<void> {
  const map = await loadMeta()
  map[String(tabId)] = value
  await saveMeta()
}

export async function metaRefreshSignal(tabId: number): Promise<boolean> {
  const map = await loadMeta()
  const hit = map[String(tabId)] ?? false
  if (hit) {
    delete map[String(tabId)]
    await saveMeta()
  }
  return hit
}

export async function appendRedirectLogEntry(entry: RedirectLogEntry): Promise<RedirectLogEntry[]> {
  const stored = await get<RedirectLogEntry[]>(STORAGE_KEYS.protectionRedirectLog)
  const next = appendRedirectLog(stored ?? [], entry)
  await set(STORAGE_KEYS.protectionRedirectLog, next)
  return next
}

export async function getRedirectLog(): Promise<RedirectLogEntry[]> {
  return (await get<RedirectLogEntry[]>(STORAGE_KEYS.protectionRedirectLog)) ?? []
}

export async function reportRedirectFalsePositive(logId: string): Promise<RedirectLogEntry[]> {
  const stored = await get<RedirectLogEntry[]>(STORAGE_KEYS.protectionRedirectLog)
  const { markLogFalsePositive } = await import('@/core/protection/redirect/log')
  const next = markLogFalsePositive(stored ?? [], logId)
  await set(STORAGE_KEYS.protectionRedirectLog, next)
  return next
}

export async function persistSessionAfterVerdict(
  tabId: number,
  openerId: number | undefined,
  session: RedirectSession | null,
  verdict: import('@/core/protection/redirect/types').RedirectVerdict,
  destHost: string,
  now: number,
  ttlMs: number,
): Promise<void> {
  const next = applyVerdictToSession(session, verdict, destHost, tabId, openerId, now, ttlMs)
  await setRedirectSession(tabId, next)
  if (next && verdict.startSession) {
    logger.debug('redirect session started', { tabId, kind: next.kind })
  }
}
