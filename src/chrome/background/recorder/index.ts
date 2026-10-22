import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import { badgeTime } from '@/core/recorder/format'
import {
  RECORDER_SESSION_KEY,
  createSession,
  elapsedMs,
  markPaused,
  markResumed,
  markStarted,
} from '@/core/recorder/session'
import { loadRecorderSettings } from '@/core/recorder/settings'
import type { RecorderSession, RecorderSettings, RecordingSource } from '@/core/recorder/types'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { acquireOffscreen, releaseOffscreen } from '../offscreen'
import {
  mountMicPermissionFrame,
  mountRecorderPill,
  removeMicPermissionFrame,
  showRecorderCountdown,
} from './controls'

const logger = createLogger('recorder')
const OFFSCREEN_OWNER = 'recorder'
const COUNTDOWN_SECONDS = 3

let current: RecorderSession | null = null
let loaded = false

async function getSession(): Promise<RecorderSession | null> {
  if (!loaded) {
    loaded = true
    const stored = await chrome.storage.session.get(RECORDER_SESSION_KEY)
    current = (stored[RECORDER_SESSION_KEY] as RecorderSession | undefined) ?? null
  }
  return current
}

async function updateBadge(session: RecorderSession | null): Promise<void> {
  try {
    if (!session) {
      await chrome.action.setBadgeText({ text: '' })
      return
    }
    const paused = session.phase === 'paused'
    await chrome.action.setBadgeBackgroundColor({ color: paused ? '#f59e0b' : '#dc2626' })
    const text = session.phase === 'pending' ? 'REC' : badgeTime(elapsedMs(session, Date.now()))
    await chrome.action.setBadgeText({ text })
  } catch (error) {
    logger.debug('badge update failed', error)
  }
}

async function setSession(next: RecorderSession | null): Promise<void> {
  const prevTab = current?.tabId
  current = next
  loaded = true
  if (next) await chrome.storage.session.set({ [RECORDER_SESSION_KEY]: next })
  else await chrome.storage.session.remove(RECORDER_SESSION_KEY)
  await updateBadge(next)
  const tabId = next?.tabId ?? prevTab
  if (tabId != null) {
    void chrome.tabs.sendMessage(tabId, { type: 'RECORDER_STATE', session: next }).catch(() => undefined)
  }
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

async function startTabCapture(id: string, settings: RecorderSettings, tab: chrome.tabs.Tab, streamId: string) {
  const tabId = tab.id!
  await setSession(createSession(id, 'tab', 'offscreen', Date.now(), { tabId, windowId: tab.windowId }))
  try {
    await chrome.scripting
      .executeScript({ target: { tabId }, func: mountRecorderPill, args: [current!] })
      .catch(() => undefined)
    const countdownMs = settings.countdown ? COUNTDOWN_SECONDS * 1000 : 0
    if (countdownMs) {
      await chrome.scripting
        .executeScript({ target: { tabId }, func: showRecorderCountdown, args: [COUNTDOWN_SECONDS] })
        .catch(() => undefined)
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
  await setSession(
    createSession(id, source, 'page', Date.now(), { pageTabId: page.id, returnTabId, windowId: page.windowId }),
  )
}

export async function startRecorder(
  source: RecordingSource,
  settings: RecorderSettings,
  tab?: chrome.tabs.Tab,
): Promise<RecorderSession> {
  if (await getSession()) throw new Error('A recording is already running.')
  const id = crypto.randomUUID()
  const target = tab?.id != null ? tab : await activeTab()

  if (source === 'tab' && target?.id != null) {
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

export async function toggleRecorderFromCommand(tab?: chrome.tabs.Tab): Promise<void> {
  if (await getSession()) {
    await stopRecorder()
    return
  }
  try {
    await startRecorder('tab', await loadRecorderSettings(), tab)
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
}
