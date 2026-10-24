import { registerMessageHandler } from '@/core/messaging'
import {
  COUNTDOWN_ALARM,
  POMODORO_ALARM,
  PENDING_ROUTE_KEY,
  TIMER_NOTIFICATION_ID,
  TIMER_ROUTE,
  countdownNotice,
  finishPomodoro,
  isCountdownDue,
  isPomodoroDue,
  type TimerNotice,
  type TimerSnapshot,
} from '@/core/timer/model'
import { loadTimer, saveTimer } from '@/core/timer/storage'

import { getSettings } from '@/features/settings/settingsService'

import { showTimerCompleteOverlay, timerOverlayTheme } from './overlay'

let chain: Promise<void> = Promise.resolve()
let listening = false

export function registerTimer(): void {
  if (listening) return
  listening = true
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === COUNTDOWN_ALARM || alarm.name === POMODORO_ALARM) void reconcileTimers()
  })
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.timer) return
    const next = changes.timer.newValue as TimerSnapshot | undefined
    chain = chain.then(
      () => armAlarms(next),
      () => armAlarms(next),
    )
  })
  chrome.notifications.onClicked.addListener((id) => {
    if (id === TIMER_NOTIFICATION_ID) void openTimerPanel()
  })
  chrome.notifications.onButtonClicked.addListener((id) => {
    if (id === TIMER_NOTIFICATION_ID) void openTimerPanel()
  })
  registerMessageHandler('TIMER_RECONCILE', () => reconcileTimers())
  void reconcileTimers()
}

export function reconcileTimers(now = Date.now()): Promise<void> {
  const run = chain.then(() => reconcileOnce(now))
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function reconcileOnce(now: number): Promise<void> {
  const snapshot = await loadTimer()
  const notices: TimerNotice[] = []

  if (isCountdownDue(snapshot.countdown, now)) {
    notices.push(countdownNotice(snapshot.countdown.label))
    snapshot.countdown = { ...snapshot.countdown, status: 'done', endAt: null, remainingMs: 0 }
  }
  if (isPomodoroDue(snapshot.pomodoro, now)) {
    const finished = finishPomodoro(snapshot.pomodoro, now)
    snapshot.pomodoro = finished.state
    notices.push(finished.notice)
  }

  if (notices.length > 0) await saveTimer(snapshot)
  for (const notice of notices) await announce(notice)
  await armAlarms(await loadTimer())
}

async function armAlarms(snapshot: TimerSnapshot | undefined): Promise<void> {
  await armOne(COUNTDOWN_ALARM, runningEnd(snapshot?.countdown))
  await armOne(POMODORO_ALARM, runningEnd(snapshot?.pomodoro))
}

function runningEnd(state: { status: string; endAt: number | null } | undefined): number | null {
  return state?.status === 'running' ? state.endAt : null
}

async function armOne(name: string, endAt: number | null): Promise<void> {
  await chrome.alarms.clear(name)
  if (endAt == null) return
  const when = Math.max(endAt, Date.now() + 200)
  try {
    await chrome.alarms.create(name, { when })
  } catch {
    try {
      const delayInMinutes = Math.max(0.5, (endAt - Date.now()) / 60_000)
      await chrome.alarms.create(name, { delayInMinutes })
    } catch {
      // Chrome may reject delays below its alarm minimum. The open panel reconciles on its own tick.
    }
  }
}

async function announce(notice: TimerNotice): Promise<void> {
  try {
    await chrome.notifications.create(TIMER_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('public/icons/icon128.png'),
      title: notice.title,
      message: notice.message,
      priority: 2,
      requireInteraction: true,
      silent: false,
      buttons: [{ title: 'Open timer' }],
    })
  } catch {
    /* notifications can be blocked */
  }
  await showOnActiveTab(notice)
}

async function showOnActiveTab(notice: TimerNotice): Promise<void> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })
    const tab = win.tabs?.find((item) => item.active)
    if (tab?.id == null || isRestricted(tab.url)) return
    const settings = await getSettings().catch(() => null)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showTimerCompleteOverlay,
      args: [notice.title, notice.message, timerOverlayTheme(settings?.theme, settings?.palette)],
    })
  } catch {
    /* the page may not allow injection; the system notification still shows */
  }
}

async function openTimerPanel(): Promise<void> {
  try {
    await chrome.storage.session.set({ [PENDING_ROUTE_KEY]: TIMER_ROUTE })
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] })
    if (win.id != null) await chrome.sidePanel.open({ windowId: win.id })
  } catch {
    /* panel may already be open */
  }
  await chrome.notifications.clear(TIMER_NOTIFICATION_ID)
}

function isRestricted(url?: string): boolean {
  if (!url) return true
  const lower = url.toLowerCase()
  return (
    lower.startsWith('chrome:') ||
    lower.startsWith('chrome-extension:') ||
    lower.startsWith('edge:') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools:')
  )
}
