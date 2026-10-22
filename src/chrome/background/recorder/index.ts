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
import { mountRecorderPill, showRecorderCountdown } from './controls'

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function startTabRecording(id: string, settings: RecorderSettings, tab?: chrome.tabs.Tab): Promise<void> {
  const target = tab?.id != null ? tab : await activeTab()
  if (target?.id == null) throw new Error('No active tab to record.')
  if (isRestrictedCaptureUrl(target.url)) {
    throw new Error('Chrome does not allow recording this page. Switch to a normal website tab.')
  }
  const tabId = target.id
  await setSession(createSession(id, 'tab', 'offscreen', Date.now(), { tabId, windowId: target.windowId }))
  try {
    await chrome.scripting
      .executeScript({ target: { tabId }, func: mountRecorderPill, args: [current!] })
      .catch(() => undefined)
    if (settings.countdown) {
      await chrome.scripting
        .executeScript({ target: { tabId }, func: showRecorderCountdown, args: [COUNTDOWN_SECONDS] })
        .catch(() => undefined)
      await delay(COUNTDOWN_SECONDS * 1000)
    }
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })
    await acquireOffscreen(OFFSCREEN_OWNER)
    const response = (await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_RECORDER_START',
      id,
      streamId,
      settings,
    })) as { ok: boolean; error?: string } | undefined
    if (!response?.ok) throw new Error(response?.error ?? 'Could not start tab recording.')
  } catch (error) {
    await releaseOffscreen(OFFSCREEN_OWNER)
    await setSession(null)
    throw error
  }
}

async function startWindowRecording(id: string, source: RecordingSource): Promise<void> {
  const url = chrome.runtime.getURL(`recorder.html?id=${encodeURIComponent(id)}&source=${source}`)
  const win = await chrome.windows.create({ url, type: 'popup', width: 440, height: 400, focused: true })
  await setSession(createSession(id, source, 'window', Date.now(), { windowId: win?.id }))
}

export async function startRecorder(
  source: RecordingSource,
  settings: RecorderSettings,
  tab?: chrome.tabs.Tab,
): Promise<RecorderSession> {
  if (await getSession()) throw new Error('A recording is already running.')
  const id = crypto.randomUUID()
  if (source === 'tab') await startTabRecording(id, settings, tab)
  else await startWindowRecording(id, source)
  return current!
}

export async function stopRecorder(): Promise<void> {
  const session = await getSession()
  if (!session) return
  if (session.phase === 'pending' && session.host === 'window') {
    if (session.windowId != null) void chrome.windows.remove(session.windowId).catch(() => undefined)
    await setSession(null)
    return
  }
  broadcastControl(session.id, 'stop')
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
  if (session.host === 'window' && session.windowId != null) {
    void chrome.windows.remove(session.windowId).catch(() => undefined)
  }
  if (error) logger.warn('recording finished with error', error)
  await chrome.tabs.create({ url: chrome.runtime.getURL(`recording.html?id=${encodeURIComponent(id)}`) })
}

export function registerRecorder(): void {
  registerMessageHandler('RECORDER_START', async (message, sender) => {
    if (message.type !== 'RECORDER_START') return null
    return { session: await startRecorder(message.source, message.settings, sender.tab) }
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
      if (session?.host === 'offscreen' && session.tabId === tabId) void stopRecorder()
    })
  })

  chrome.windows.onRemoved.addListener((windowId) => {
    void getSession().then((session) => {
      if (session?.host !== 'window' || session.windowId !== windowId) return
      // The recorder page owned the MediaRecorder; closing it ends the session.
      void setSession(null)
    })
  })
}
