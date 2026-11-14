import type { RecorderSession } from '@/core/recorder/types'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { originPatternForUrl } from '@/core/permissions/siteAccess'

export const RECORDER_COUNTDOWN_JS = 'inject/recorder-countdown.js'
export const RECORDER_PILL_JS = 'inject/recorder-pill.js'
export const RECORDER_UNMOUNT_JS = 'inject/recorder-unmount.js'
export const RECORDER_COUNTDOWN_UNMOUNT_JS = 'inject/recorder-countdown-unmount.js'
export const RECORDER_PROBE_JS = 'inject/recorder-probe.js'
export const RECORDER_PILL_SESSION_KEY = 'tbxRecorderPillSession'
export const COUNTDOWN_SEC_KEY = 'tbxCountdownSeconds'
export const COUNTDOWN_CAPTION_KEY = 'tbxCountdownCaption'

export type RecorderTabAccess =
  | { ok: true; tabId: number; url: string }
  | { ok: false; reason: 'no-tab' | 'restricted' | 'permission'; url?: string }

export async function probeRecorderTabAccess(tab: chrome.tabs.Tab): Promise<RecorderTabAccess> {
  if (tab.id == null || !tab.url) return { ok: false, reason: 'no-tab' }
  if (isRestrictedCaptureUrl(tab.url)) return { ok: false, reason: 'restricted' }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [RECORDER_PROBE_JS] })
    return { ok: true, tabId: tab.id, url: tab.url }
  } catch {
    return { ok: false, reason: 'permission', url: tab.url }
  }
}

export function hostPermissionPattern(url: string | undefined): string | null {
  return originPatternForUrl(url)
}

/** Args-only. Chrome serializes this into the tab — do not close over imports. */
export function stampCountdownArgs(seconds: number, caption: string): void {
  const g = globalThis as unknown as { __tbxCountdownSeconds?: number; __tbxCountdownCaption?: string }
  g.__tbxCountdownSeconds = seconds
  g.__tbxCountdownCaption = caption
}

export async function injectRecorderCountdown(tabId: number, seconds: number, caption: string): Promise<void> {
  await chrome.storage.session.set({
    [COUNTDOWN_SEC_KEY]: seconds,
    [COUNTDOWN_CAPTION_KEY]: caption,
  })
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: stampCountdownArgs,
      args: [seconds, caption],
    })
  } catch {
    /* files still mount; storage callback applies remaining seconds */
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [RECORDER_COUNTDOWN_JS],
  })
}

export async function injectRecorderPill(tabId: number, session: RecorderSession): Promise<void> {
  await chrome.storage.session.set({ [RECORDER_PILL_SESSION_KEY]: session })
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [RECORDER_PILL_JS],
  })
}

export async function unmountRecorderCountdown(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [RECORDER_COUNTDOWN_UNMOUNT_JS],
  })
}

export async function unmountCountdownOnAllTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs.map((tab) =>
      tab.id != null ? unmountRecorderCountdown(tab.id).catch(() => undefined) : undefined,
    ),
  )
}

export async function unmountRecorderPageUi(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: [RECORDER_UNMOUNT_JS] })
}

export async function clearRecorderPageOverlays(tabId: number): Promise<void> {
  await unmountRecorderPageUi(tabId).catch(() => undefined)
}
