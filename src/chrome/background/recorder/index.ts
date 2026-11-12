import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
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
import {
  isRecorderMenuAction,
  recorderSourceFromMenuAction,
  RECORDER_STOP_MENU_ID,
  syncRecorderContextMenu,
} from './contextMenus'
import {
  mountMicPermissionFrame,
  removeMicPermissionFrame,
  showRecorderCountdown,
  unmountRecorderCountdown,
  unmountRecorderPill,
} from './controls'
import {
  clearRecorderPillForSession,
  syncRecorderPill,
  syncRoamingPill,
  usesRoamingPill,
} from './pillSync'

const logger = createLogger('recorder')
const OFFSCREEN_OWNER = 'recorder'
const COUNTDOWN_SECONDS = 3
const BADGE_TICK_MS = 1000
const DEFAULT_ACTION_TITLE = 'Open One Panel'

let current: RecorderSession | null = null
let badgeTicker: ReturnType<typeof setInterval> | undefined

async function getSession(): Promise<RecorderSession | null> {
  const stored = await chrome.storage.session.get(RECORDER_SESSION_KEY)
  current = (stored[RECORDER_SESSION_KEY] as RecorderSession | undefined) ?? null
  return current
}

async function updateBadge(session: RecorderSession | null): Promise<void> {
  try {
    if (!session) {
      await chrome.action.setBadgeText({ text: '' })
      await chrome.action.setTitle({ title: DEFAULT_ACTION_TITLE })
      return
    }
    const now = Date.now()
    const countdown = countdownSecondsLeft(session, now)
    const paused = session.phase === 'paused'
    await chrome.action.setBadgeBackgroundColor({ color: paused ? '#f59e0b' : '#dc2626' })
    if (session.phase === 'stopping') {
      await chrome.action.setBadgeText({ text: '…' })
      await chrome.action.setTitle({ title: 'Saving recording…' })
      return
    }
    const text =
      countdown > 0 ? String(countdown) : session.phase === 'pending' ? 'REC' : badgeTime(elapsedMs(session, now))
    await chrome.action.setBadgeText({ text })
    const source =
      session.source === 'tab' ? 'tab' : session.source === 'window' ? 'window' : 'screen'
    const timerLabel =
      countdown > 0 ? `${countdown}s` : session.phase === 'pending' ? 'starting' : badgeTime(elapsedMs(session, now))
    await chrome.action.setTitle({
      title:
        countdown > 0
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

function clearInPageRecorderUi(session: RecorderSession): void {
  const tabIds = new Set<number>()
  if (session.tabId != null) tabIds.add(session.tabId)
  if (session.returnTabId != null) tabIds.add(session.returnTabId)
  for (const tabId of tabIds) {
    void chrome.scripting
      .executeScript({ target: { tabId }, func: unmountRecorderCountdown })
      .catch(() => undefined)
  }
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

function broadcastControl(id: string, action: 'pause' | 'resume' | 'stop'): void {
  void chrome.runtime.sendMessage({ type: 'RECORDER_CONTROL', id, action }).catch(() => undefined)
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tab
}

/** tabCapture only works after the user invoked the extension on that tab (action click or manifest command). */
function isNotInvokedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /not been invoked|activeTab/i.test(message)
}

async function beginCountdown(session: RecorderSession, tabId?: number): Promise<void> {
  const until = Date.now() + COUNTDOWN_SECONDS * 1000
  await setSession(markCountdown(session, until))
  const targetTabId = tabId ?? session.tabId ?? session.returnTabId
  if (targetTabId != null) {
    await chrome.scripting
      .executeScript({ target: { tabId: targetTabId }, func: showRecorderCountdown, args: [COUNTDOWN_SECONDS] })
      .catch(() => undefined)
  }
}

async function startTabCapture(id: string, settings: RecorderSettings, tab: chrome.tabs.Tab, streamId: string) {
  const tabId = tab.id!
  await setSession(createSession(id, 'tab', 'offscreen', Date.now(), { tabId, windowId: tab.windowId }))
  try {
    const countdownMs = settings.countdown ? COUNTDOWN_SECONDS * 1000 : 0
    if (countdownMs) {
      await beginCountdown(current!, tabId)
    }
    await acquireOffscreen(OFFSCREEN_OWNER)
    const response = (await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_RECORDER_START',
      id,
      streamId,
      settings,
      delayMs: countdownMs ? countdownMs + 150 : 0,
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
  const returnTabId = tab?.id
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
  const target = tab?.id != null ? tab : await activeTab()

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
  const tab = await activeTab()
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
  registerMessageHandler('RECORDER_START', async (message, sender) => {
    if (message.type !== 'RECORDER_START') return null
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
    if (!session || session.id !== message.id) return { ok: false }
    await beginCountdown(session, message.tabId)
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

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void getSession().then((session) => {
      if (session && usesRoamingPill(session)) void syncRoamingPill(session, tabId)
    })
  })

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.active || changeInfo.status !== 'complete') return
    void getSession().then((session) => {
      if (session && usesRoamingPill(session)) void syncRoamingPill(session, tabId)
    })
  })

  void getSession().then(async (session) => {
    syncRecorderContextMenu(session)
    syncBadgeTicker(session)
    if (session) {
      await updateBadge(session)
      await syncRecorderPill(session)
    }
  })

  void getSession().then((session) => {
    if (session) return
    void chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id == null) continue
        void chrome.scripting
          .executeScript({ target: { tabId: tab.id }, func: unmountRecorderPill })
          .catch(() => undefined)
      }
    })
  })
}
