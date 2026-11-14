import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import {
  RECORDER_COUNTDOWN_MS,
  RECORDER_COUNTDOWN_SECONDS,
  RECORDER_COUNTDOWN_SETTLE_MS,
  recorderPreRollDelayMs,
} from '@/core/recorder/countdown'
import { badgeTime } from '@/core/recorder/format'
import {
  RECORDER_SESSION_KEY,
  countdownSecondsLeft,
  createSession,
  elapsedMs,
  markCountdown,
  markPaused,
  markResumed,
  markStarted,
  markStopping,
} from '@/core/recorder/session'
import { loadRecorderSettings } from '@/core/recorder/settings'
import type { RecorderSession, RecorderSettings, RecordingSource } from '@/core/recorder/types'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { hasCapability } from '@/platform/capabilities'

import { acquireOffscreen, releaseOffscreen } from '../offscreen'
import { applyRecorderToolbarBadge, stampRecorderBadgeOnTab } from './badge'
import {
  isRecorderMenuAction,
  recorderSourceFromMenuAction,
  RECORDER_STOP_MENU_ID,
  syncRecorderContextMenu,
} from './contextMenus'
import { mountMicPermissionFrame, removeMicPermissionFrame } from './controls'
import {
  COUNTDOWN_SEC_KEY,
  clearRecorderPageOverlays,
  injectRecorderCountdown,
  injectRecorderPill,
  probeRecorderTabAccess,
  unmountCountdownOnAllTabs,
  unmountRecorderPageUi,
} from './injectPage'
import { resolveRecorderTargetTab } from './resolveTargetTab'
import {
  clearRecorderPillForSession,
  syncRecorderPill,
  syncRoamingPill,
  usesRoamingPill,
} from './pillSync'

const logger = createLogger('recorder')
const OFFSCREEN_OWNER = 'recorder'
const BADGE_TICK_MS = 1000
const DEFAULT_ACTION_TITLE = 'Open One Panel'

let current: RecorderSession | null = null
let badgeTicker: ReturnType<typeof setInterval> | undefined
let countdownUnmountTimer: ReturnType<typeof setTimeout> | undefined

async function getSession(): Promise<RecorderSession | null> {
  const stored = await chrome.storage.session.get(RECORDER_SESSION_KEY)
  current = (stored[RECORDER_SESSION_KEY] as RecorderSession | undefined) ?? null
  return current
}

async function updateBadge(session: RecorderSession | null): Promise<void> {
  try {
    await applyRecorderToolbarBadge(session)
    if (!session) {
      await chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE })
      return
    }
    const now = Date.now()
    const countdown = countdownSecondsLeft(session, now)
    const source = session.source === 'tab' ? 'tab' : session.source === 'window' ? 'window' : 'screen'
    const timerLabel =
      countdown > 0 ? `${countdown}s` : session.phase === 'pending' ? 'starting' : badgeTime(elapsedMs(session, now))
    if (countdown > 0) void chrome.storage.session.set({ [COUNTDOWN_SEC_KEY]: countdown })
    await chrome.action.setTitle({
      title:
        session.phase === 'stopping'
          ? 'Saving recording…'
          : countdown > 0
            ? `Recording starts in ${countdown}s (${source}). Right-click → Stop recording.`
            : `Recording ${source} (${timerLabel}). Right-click → Stop recording.`,
    })
  } catch (error) {
    logger.debug('badge update failed', error)
  }
}

function syncBadgeTicker(session: RecorderSession | null): void {
  if (session && session.phase !== 'stopping') {
    if (badgeTicker != null) return
    badgeTicker = setInterval(() => {
      void getSession().then((active) => {
        if (!active || active.phase === 'stopping') return
        void updateBadge(active)
      })
    }, BADGE_TICK_MS)
    return
  }
  if (badgeTicker != null) {
    clearInterval(badgeTicker)
    badgeTicker = undefined
  }
}

function clearCountdownUnmountTimer(): void {
  if (countdownUnmountTimer == null) return
  clearTimeout(countdownUnmountTimer)
  countdownUnmountTimer = undefined
}

function scheduleCountdownUnmount(until: number): void {
  clearCountdownUnmountTimer()
  const wait = Math.max(0, until - Date.now())
  countdownUnmountTimer = setTimeout(() => {
    countdownUnmountTimer = undefined
    void unmountCountdownOnAllTabs()
  }, wait)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitOutCountdownAndUnmount(): Promise<void> {
  const session = await getSession()
  const until = session?.countdownUntil ?? Date.now()
  const wait = Math.max(0, until - Date.now())
  if (wait) await sleep(wait)
  clearCountdownUnmountTimer()
  await unmountCountdownOnAllTabs()
  await sleep(RECORDER_COUNTDOWN_SETTLE_MS)
}

function clearInPageRecorderUi(session: RecorderSession): void {
  clearCountdownUnmountTimer()
  const tabIds = new Set<number>()
  if (session.tabId != null) tabIds.add(session.tabId)
  if (session.returnTabId != null) tabIds.add(session.returnTabId)
  for (const tabId of tabIds) void clearRecorderPageOverlays(tabId)
  void clearRecorderPillForSession(session)
}

async function setSession(next: RecorderSession | null): Promise<void> {
  const prev = current
  current = next
  if (next) await chrome.storage.session.set({ [RECORDER_SESSION_KEY]: next })
  else await chrome.storage.session.remove(RECORDER_SESSION_KEY)
  if (!next && prev) clearInPageRecorderUi(prev)
  else if (next) void syncRecorderPill(next)
  await updateBadge(next)
  syncBadgeTicker(next)
  syncRecorderContextMenu(next)
}

function restoreRecorderIndication(
  session: RecorderSession,
  tabId: number,
  active: boolean,
  remountOverlay: boolean,
): void {
  void stampRecorderBadgeOnTab(tabId, session)
  if (!active) return
  if (usesRoamingPill(session)) void syncRoamingPill(session, tabId)
  if (!remountOverlay) return
  const left = countdownSecondsLeft(session, Date.now())
  if (left <= 0) return
  const caption = chrome.i18n.getMessage('recorderCountdownCaption') || 'Recording starts…'
  void injectRecorderCountdown(tabId, left, caption).catch(() => undefined)
}

function broadcastControl(id: string, action: 'pause' | 'resume' | 'stop'): void {
  void chrome.runtime.sendMessage({ type: 'RECORDER_CONTROL', id, action }).catch(() => undefined)
}

/** tabCapture only works after the user invoked the extension on that tab (action click or manifest command). */
function isNotInvokedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not been invoked|activeTab/i.test(message)
}

async function beginCountdown(session: RecorderSession, tabId?: number): Promise<void> {
  const caption = chrome.i18n.getMessage('recorderCountdownCaption') || 'Recording starts…'
  const until = Date.now() + RECORDER_COUNTDOWN_MS
  const next = markCountdown(session, until)
  await setSession(next)
  let targetTabId = tabId ?? next.tabId ?? next.returnTabId
  if (targetTabId == null) {
    const resolved = await resolveRecorderTargetTab()
    targetTabId = resolved?.id
  }
  if (targetTabId == null) {
    throw new Error('Open the website tab you want to record, then start again.')
  }
  await chrome.tabs.update(targetTabId, { active: true }).catch(() => undefined)
  await injectRecorderCountdown(targetTabId, RECORDER_COUNTDOWN_SECONDS, caption)
  await injectRecorderPill(targetTabId, next).catch(() => undefined)
  scheduleCountdownUnmount(until)
}

async function startTabCapture(id: string, settings: RecorderSettings, tab: chrome.tabs.Tab, streamId: string) {
  const tabId = tab.id!
  await setSession(createSession(id, 'tab', 'offscreen', Date.now(), { tabId, windowId: tab.windowId }))
  try {
    if (settings.countdown) {
      await beginCountdown(current!, tabId)
    }
    await acquireOffscreen(OFFSCREEN_OWNER)
    const response = (await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_RECORDER_START',
      id,
      streamId,
      settings,
      delayMs: recorderPreRollDelayMs(current?.countdownUntil, Date.now()),
    })) as { ok: boolean; error?: string } | undefined
    if (!response?.ok) throw new Error(response?.error ?? 'Could not start tab recording.')
  } catch (error) {
    await releaseOffscreen(OFFSCREEN_OWNER)
    await setSession(null)
    throw error
  }
}

/**
 * Chrome only lets the page that opened the share picker consume its stream, so window and
 * screen recordings run in a pinned extension tab. It opens the picker right away, then hands
 * focus back to the tab the user came from.
 */
async function startPageCapture(id: string, source: RecordingSource, tab?: chrome.tabs.Tab) {
  const resolved = await resolveRecorderTargetTab(tab)
  const returnTabId = resolved?.id
  const url = chrome.runtime.getURL(
    `recorder.html?mode=record&id=${encodeURIComponent(id)}&source=${source}` +
      (returnTabId != null ? `&returnTab=${returnTabId}` : ''),
  )
  const page = await chrome.tabs.create({ url, pinned: true, active: true, windowId: tab?.windowId })
  const session = createSession(id, source, 'page', Date.now(), {
    pageTabId: page.id,
    returnTabId,
    windowId: page.windowId,
  })
  await setSession(session)
}

export async function startRecorder(
  source: RecordingSource,
  settings: RecorderSettings,
  tab?: chrome.tabs.Tab,
): Promise<RecorderSession> {
  if (!settings.enabled) {
    throw new Error('Screen recording is turned off. Turn it on in Settings or the Screen Recorder tool.')
  }
  if (await getSession()) throw new Error('A recording is already running.')
  const id = crypto.randomUUID()
  const target = await resolveRecorderTargetTab(tab)

  if (source === 'tab' && target?.id != null && hasCapability('tabCapture')) {
    if (isRestrictedCaptureUrl(target.url)) {
      throw new Error('Chrome does not allow recording this page. Switch to a normal website tab.')
    }
    try {
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: target.id })
      await startTabCapture(id, settings, target, streamId)
      return current!
    } catch (error) {
      if (!isNotInvokedError(error)) throw error
      logger.debug('tabCapture not granted for this tab; using the share picker', error)
    }
  }
  await startPageCapture(id, source, target)
  return current!
}

export async function stopRecorder(): Promise<void> {
  const session = await getSession()
  if (!session) return
  if (session.host === 'page' && session.phase === 'pending') {
    await setSession(null)
    if (session.returnTabId != null) void chrome.tabs.update(session.returnTabId, { active: true }).catch(() => undefined)
    if (session.pageTabId != null) void chrome.tabs.remove(session.pageTabId).catch(() => undefined)
    return
  }
  if (session.phase === 'stopping') return
  await setSession(markStopping(session, Date.now()))
  broadcastControl(session.id, 'stop')
}

let micResolver: ((granted: boolean) => void) | null = null
const MIC_PROMPT_TIMEOUT_MS = 60_000

/**
 * Chrome only shows its permission prompt on a visible page. A hidden extension frame in the
 * current tab asks for the microphone, so the grant belongs to the extension and the offscreen
 * recorder can use it.
 */
async function requestMicrophone(): Promise<{ granted: boolean; fallback?: boolean }> {
  const tab = await resolveRecorderTargetTab()
  const url = chrome.runtime.getURL('recorder.html?mode=permission&embed=1')
  if (tab?.id == null || isRestrictedCaptureUrl(tab.url)) {
    await chrome.windows.create({
      url: chrome.runtime.getURL('recorder.html?mode=permission'),
      type: 'popup',
      width: 420,
      height: 360,
    })
    return { granted: false, fallback: true }
  }
  const tabId = tab.id
  micResolver?.(false)
  const result = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), MIC_PROMPT_TIMEOUT_MS)
    micResolver = (granted) => {
      clearTimeout(timer)
      micResolver = null
      resolve(granted)
    }
  })
  await chrome.scripting.executeScript({ target: { tabId }, func: mountMicPermissionFrame, args: [url] })
  const granted = await result
  void chrome.scripting
    .executeScript({ target: { tabId }, func: removeMicPermissionFrame })
    .catch(() => undefined)
  return { granted }
}

export async function handleRecorderMenuClick(menuItemId: string, tab?: chrome.tabs.Tab): Promise<void> {
  if (menuItemId === RECORDER_STOP_MENU_ID) {
    await stopRecorder()
    return
  }
  const source = recorderSourceFromMenuAction(menuItemId)
  if (!source) return
  const settings = await loadRecorderSettings()
  if (!settings.enabled) {
    void chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: 'Screen recorder',
      message: 'Screen recording is turned off. Enable it in Settings or the Screen Recorder tool.',
    })
    return
  }
  try {
    await startRecorder(source, settings, tab)
  } catch (error) {
    logger.warn('context menu start failed', error)
    void chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: 'Screen recorder',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

export { isRecorderMenuAction }

export async function toggleRecorderFromCommand(tab?: chrome.tabs.Tab): Promise<void> {
  if (await getSession()) {
    await stopRecorder()
    return
  }
  const settings = await loadRecorderSettings()
  if (!settings.enabled) {
    void chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: 'Screen recorder',
      message: 'Screen recording is turned off. Enable it in Settings or the Screen Recorder tool.',
    })
    return
  }
  try {
    await startRecorder('tab', settings, tab)
  } catch (error) {
    logger.warn('command start failed', error)
    void chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: 'Screen recorder',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

async function onFinished(id: string, error?: string): Promise<void> {
  const session = await getSession()
  if (!session || session.id !== id) return
  await setSession(null)
  if (session.host === 'offscreen') await releaseOffscreen(OFFSCREEN_OWNER)
  if (session.pageTabId != null) void chrome.tabs.remove(session.pageTabId).catch(() => undefined)
  if (error) logger.warn('recording finished with error', error)
  await chrome.tabs.create({ url: chrome.runtime.getURL(`recording.html?id=${encodeURIComponent(id)}`) })
}

export function registerRecorder(): void {
  registerMessageHandler('RECORDER_ENSURE_ACCESS', async (_message, sender) => {
    const tab = await resolveRecorderTargetTab(sender.tab)
    if (!tab) return { ok: false, reason: 'no-tab' as const }
    return probeRecorderTabAccess(tab)
  })

  registerMessageHandler('RECORDER_START', async (message, sender) => {
    if (message.type !== 'RECORDER_START') return null
    const target = await resolveRecorderTargetTab(sender.tab)
    if (message.settings.countdown && target) {
      const access = await probeRecorderTabAccess(target)
      if (!access.ok && access.reason === 'restricted') {
        throw new Error('Chrome cannot show the countdown on this page. Open a normal website tab first.')
      }
    }
    return { session: await startRecorder(message.source, message.settings, sender.tab) }
  })

  registerMessageHandler('RECORDER_REQUEST_MIC', () => requestMicrophone())

  registerMessageHandler('RECORDER_MIC_RESULT', (message) => {
    if (message.type !== 'RECORDER_MIC_RESULT') return null
    micResolver?.(message.granted)
    return { ok: true }
  })

  registerMessageHandler('RECORDER_STATUS', async () => ({ session: await getSession() }))

  registerMessageHandler('RECORDER_PAUSE', async () => {
    const session = await getSession()
    if (!session || session.phase !== 'recording') return { ok: false }
    broadcastControl(session.id, 'pause')
    await setSession(markPaused(session, Date.now()))
    return { ok: true }
  })

  registerMessageHandler('RECORDER_RESUME', async () => {
    const session = await getSession()
    if (!session || session.phase !== 'paused') return { ok: false }
    broadcastControl(session.id, 'resume')
    await setSession(markResumed(session, Date.now()))
    return { ok: true }
  })

  registerMessageHandler('RECORDER_STOP', async () => {
    await stopRecorder()
    return { ok: true }
  })

  registerMessageHandler('RECORDER_COUNTDOWN_BEGIN', async (message) => {
    if (message.type !== 'RECORDER_COUNTDOWN_BEGIN') return null
    const session = await getSession()
    if (!session || session.id !== message.id) {
      throw new Error('Recording session is not active.')
    }
    await beginCountdown(session, message.tabId)
    return { ok: true }
  })

  registerMessageHandler('RECORDER_COUNTDOWN_WAIT', async (message) => {
    if (message.type !== 'RECORDER_COUNTDOWN_WAIT') return null
    const session = await getSession()
    if (!session || session.id !== message.id) {
      throw new Error('Recording session is not active.')
    }
    await waitOutCountdownAndUnmount()
    return { ok: true }
  })

  registerMessageHandler('RECORDER_STARTED', async (message) => {
    if (message.type !== 'RECORDER_STARTED') return null
    const session = await getSession()
    if (session?.id === message.id) await setSession(markStarted(session, Date.now()))
    return { ok: true }
  })

  registerMessageHandler('RECORDER_HEARTBEAT', async (message) => {
    if (message.type !== 'RECORDER_HEARTBEAT') return null
    const session = await getSession()
    if (session?.id === message.id) await updateBadge(session)
    return { ok: true }
  })

  registerMessageHandler('RECORDER_FINISHED', async (message) => {
    if (message.type !== 'RECORDER_FINISHED') return null
    await onFinished(message.id, message.error)
    return { ok: true }
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void getSession().then((session) => {
      if (!session) return
      if (session.host === 'offscreen' && session.tabId === tabId) void stopRecorder()
      // The recorder tab owns the MediaRecorder; closing it ends the session.
      else if (session.host === 'page' && session.pageTabId === tabId) void setSession(null)
    })
  })

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id == null) return
    void getSession().then((session) => {
      if (session) restoreRecorderIndication(session, tab.id!, Boolean(tab.active), true)
    })
  })

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void getSession().then((session) => {
      if (session) restoreRecorderIndication(session, tabId, true, false)
    })
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return
    void getSession().then((session) => {
      if (session) restoreRecorderIndication(session, tabId, Boolean(tab.active), true)
    })
  })

  void getSession().then(async (session) => {
    syncRecorderContextMenu(session)
    syncBadgeTicker(session)
    if (session) {
      await updateBadge(session)
      await syncRecorderPill(session)
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      if (tab?.id != null) restoreRecorderIndication(session, tab.id, true, true)
    }
  })

  void getSession().then((session) => {
    if (session) return
    void chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id == null) continue
        void unmountRecorderPageUi(tab.id).catch(() => undefined)
      }
    })
  })
}
