/**
 * Page world, top frame, document_start. Breaks the tricks tech-support scam pages use to
 * "lock" the browser: endless alert/confirm loops, forced fullscreen fake error screens,
 * keyboard lock, back-button traps via history flooding, and "Leave site?" prompts.
 *
 * Normal pages are untouched until enough of these show up together; then the page is put in
 * lockdown and every trick is neutralised at once.
 */
import { onIsolatedCommand, signalIsolated, userActivationActive } from './pageBridge'

type GuardedWindow = Window & { __toolboxScamGuard?: boolean }

const DIALOG_WINDOW_MS = 15_000
const DIALOG_FLOOD = 3
const HISTORY_WINDOW_MS = 3_000
const HISTORY_FLOOD = 15
const LOCKDOWN_SCORE = 3

let score = 0
let locked = false
const dialogTimes: number[] = []
const historyTimes: number[] = []
const unloadHandlers: EventListenerOrEventListenerObject[] = []

function recent(times: number[], windowMs: number): number {
  const cutoff = Date.now() - windowMs
  while (times.length && times[0] < cutoff) times.shift()
  return times.length
}

function addScore(points: number): void {
  score += points
  if (!locked && score >= LOCKDOWN_SCORE) lockdown()
}

function lockdown(): void {
  if (locked) return
  locked = true
  try {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  } catch {
    /* not in fullscreen */
  }
  try {
    ;(navigator as Navigator & { keyboard?: { unlock(): void } }).keyboard?.unlock()
  } catch {
    /* unsupported */
  }
  try {
    document.exitPointerLock?.()
  } catch {
    /* unsupported */
  }
  for (const handler of unloadHandlers) window.removeEventListener('beforeunload', handler)
  window.onbeforeunload = null
  signalIsolated('lockdown')
}

function patchDialogs(): void {
  const nativeAlert = window.alert.bind(window)
  const nativeConfirm = window.confirm.bind(window)
  const nativePrompt = window.prompt.bind(window)
  const gate = (): boolean => {
    dialogTimes.push(Date.now())
    if (recent(dialogTimes, DIALOG_WINDOW_MS) >= DIALOG_FLOOD) addScore(LOCKDOWN_SCORE)
    return !locked
  }
  window.alert = (message?: unknown) => {
    if (gate()) nativeAlert(message)
  }
  window.confirm = (message?: string) => (gate() ? nativeConfirm(message) : false)
  window.prompt = (message?: string, defaultValue?: string) =>
    gate() ? nativePrompt(message, defaultValue) : null
}

function patchFullscreen(): void {
  const proto = Element.prototype as Element & { webkitRequestFullscreen?: () => void }
  const native = proto.requestFullscreen
  if (!native) return
  proto.requestFullscreen = function (this: Element, options?: FullscreenOptions) {
    if (locked || !userActivationActive()) {
      addScore(1)
      return Promise.reject(new DOMException('Fullscreen blocked', 'NotAllowedError'))
    }
    return native.call(this, options)
  }
  if (proto.webkitRequestFullscreen) proto.webkitRequestFullscreen = proto.requestFullscreen
}

function patchKeyboardLock(): void {
  const keyboard = (navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void> } })
    .keyboard
  if (!keyboard?.lock) return
  const native = keyboard.lock.bind(keyboard)
  keyboard.lock = (keys?: string[]) => {
    // Escape-key capture is the signature of "you cannot leave this page" lockers
    addScore(2)
    if (locked) return Promise.reject(new DOMException('Keyboard lock blocked', 'NotAllowedError'))
    return native(keys)
  }
}

function patchHistory(): void {
  const nativePush = history.pushState.bind(history)
  history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    historyTimes.push(Date.now())
    if (recent(historyTimes, HISTORY_WINDOW_MS) >= HISTORY_FLOOD) {
      addScore(LOCKDOWN_SCORE)
      return
    }
    if (locked) return
    nativePush(data, unused, url)
  }
}

function patchBeforeUnload(): void {
  const nativeAdd = window.addEventListener.bind(window)
  window.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (!listener) return
    if (type === 'beforeunload') {
      if (locked) return
      unloadHandlers.push(listener)
    }
    nativeAdd(type, listener, options)
  } as typeof window.addEventListener
}

const guarded = window as GuardedWindow
if (!guarded.__toolboxScamGuard && window.top === window) {
  guarded.__toolboxScamGuard = true
  patchDialogs()
  patchFullscreen()
  patchKeyboardLock()
  patchHistory()
  patchBeforeUnload()
  onIsolatedCommand('lockdown', lockdown)
}
