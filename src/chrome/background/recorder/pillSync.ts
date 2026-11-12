import type { RecorderSession } from '@/core/recorder/types'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { mountRecorderPill, unmountRecorderPill } from './controls'

let roamingPillTabId: number | undefined

export function roamingPillHostTabId(): number | undefined {
  return roamingPillTabId
}

export function usesRoamingPill(session: RecorderSession): boolean {
  return session.host === 'page'
}

async function tabCanHostPill(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    return tab.id != null && !!tab.url && !isRestrictedCaptureUrl(tab.url)
  } catch {
    return false
  }
}

export async function clearRoamingPill(): Promise<void> {
  if (roamingPillTabId == null) return
  const tabId = roamingPillTabId
  roamingPillTabId = undefined
  await chrome.scripting.executeScript({ target: { tabId }, func: unmountRecorderPill }).catch(() => undefined)
}

export async function syncRoamingPill(session: RecorderSession, tabId: number): Promise<void> {
  if (!usesRoamingPill(session) || session.pageTabId === tabId) return
  if (!(await tabCanHostPill(tabId))) return
  if (roamingPillTabId != null && roamingPillTabId !== tabId) {
    void chrome.scripting
      .executeScript({ target: { tabId: roamingPillTabId }, func: unmountRecorderPill })
      .catch(() => undefined)
  }
  roamingPillTabId = tabId
  await chrome.scripting
    .executeScript({ target: { tabId }, func: mountRecorderPill, args: [session] })
    .catch(() => undefined)
}

export async function syncRoamingPillToFocused(session: RecorderSession): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (tab?.id != null) await syncRoamingPill(session, tab.id)
}

export async function syncRecorderPill(session: RecorderSession): Promise<void> {
  if (session.host === 'offscreen' && session.tabId != null) {
    await chrome.scripting
      .executeScript({ target: { tabId: session.tabId }, func: mountRecorderPill, args: [session] })
      .catch(() => undefined)
    return
  }
  if (usesRoamingPill(session)) {
    const host = roamingPillTabId
    if (host != null && (await tabCanHostPill(host))) {
      await chrome.scripting
        .executeScript({ target: { tabId: host }, func: mountRecorderPill, args: [session] })
        .catch(() => undefined)
      return
    }
    if (session.returnTabId != null) await syncRoamingPill(session, session.returnTabId)
    else await syncRoamingPillToFocused(session)
  }
}

export async function clearRecorderPillForSession(session: RecorderSession): Promise<void> {
  if (session.host === 'offscreen' && session.tabId != null) {
    await chrome.scripting
      .executeScript({ target: { tabId: session.tabId }, func: unmountRecorderPill })
      .catch(() => undefined)
  }
  await clearRoamingPill()
}
