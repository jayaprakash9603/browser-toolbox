import type { RecorderSession } from '@/core/recorder/types'

const COUNTDOWN_HOST_ID = 'toolbox-recorder-countdown'
const PILL_HOST_ID = 'toolbox-recorder-pill'

type PillWindow = Window & { __tbxRecorderPill?: (s: RecorderSession | null) => void }

const SOURCE_LABEL: Record<RecorderSession['source'], string> = {
  tab: 'Tab',
  window: 'Window',
  screen: 'Screen',
}

/**
 * Runs in the recorded tab (isolated world). Builds a small draggable control pill in a
 * shadow root and listens for session updates through re-injection.
 */
export function unmountRecorderPill(): void {
  const w = window as PillWindow
  if (w.__tbxRecorderPill) {
    w.__tbxRecorderPill(null)
    return
  }
  document.getElementById(PILL_HOST_ID)?.remove()
  delete w.__tbxRecorderPill
}

export function mountRecorderPill(initial: RecorderSession): void {
  const w = window as PillWindow
  if (w.__tbxRecorderPill) {
    w.__tbxRecorderPill(initial)
    return
  }

  const host = document.createElement('div')
  host.id = PILL_HOST_ID
  host.style.cssText =
    'all:initial;position:fixed;right:12px;top:50%;transform:translateY(-50%);z-index:2147483646;'
  const root = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = `
    .pill{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 7px;border-radius:12px;
      background:rgba(17,17,17,.92);color:#fff;font:600 11px/1.2 system-ui,sans-serif;
      box-shadow:0 4px 20px rgba(0,0,0,.4);cursor:grab;user-select:none;border:1px solid rgba(255,255,255,.08);
      min-width:52px}
    .dot{width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.35)}
    .paused .dot{background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.35)}
    .label{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.75}
    .time{font-size:12px;min-width:44px;text-align:center;font-variant-numeric:tabular-nums}
    .row{display:flex;flex-direction:column;gap:4px;width:100%}
    button{all:unset;cursor:pointer;padding:5px 0;border-radius:8px;background:rgba(255,255,255,.12);
      text-align:center;font-size:10px;font-weight:600}
    button:hover{background:rgba(255,255,255,.22)}
    button.stop{background:#ef4444}
    button.stop:hover{background:#dc2626}
  `
  const pill = document.createElement('div')
  pill.className = 'pill'
  const dot = document.createElement('span')
  dot.className = 'dot'
  const label = document.createElement('span')
  label.className = 'label'
  const time = document.createElement('span')
  time.className = 'time'
  const row = document.createElement('div')
  row.className = 'row'
  const pauseBtn = document.createElement('button')
  const stopBtn = document.createElement('button')
  stopBtn.className = 'stop'
  stopBtn.textContent = 'Stop'
  row.append(pauseBtn, stopBtn)
  pill.append(dot, label, time, row)
  root.append(style, pill)
  document.documentElement.appendChild(host)

  let session: RecorderSession | null = initial
  const countdownSec = (s: RecorderSession) => {
    if (!s.countdownUntil || s.countdownUntil <= Date.now()) return 0
    return Math.ceil((s.countdownUntil - Date.now()) / 1000)
  }
  const elapsed = (s: RecorderSession) => {
    if (s.phase === 'pending' || !s.startedAt) return 0
    const end = s.phase === 'paused' || s.phase === 'stopping' ? s.pausedAt : Date.now()
    return Math.max(0, end - s.startedAt - s.pausedMs)
  }
  const fmt = (ms: number) => {
    const t = Math.floor(ms / 1000)
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  }
  const render = () => {
    if (!session) return
    const stopping = session.phase === 'stopping'
    const cd = countdownSec(session)
    pill.classList.toggle('paused', session.phase === 'paused' || stopping)
    label.textContent = SOURCE_LABEL[session.source]
    time.textContent =
      cd > 0 ? String(cd) : session.phase === 'pending' ? '…' : stopping ? 'Save' : fmt(elapsed(session))
    pauseBtn.textContent = session.phase === 'paused' ? 'Resume' : 'Pause'
    row.style.display = session.phase === 'pending' || stopping || cd > 0 ? 'none' : ''
  }
  const timer = window.setInterval(render, 500)
  render()

  const send = (type: string) => {
    try {
      void chrome.runtime.sendMessage({ type }).catch(() => undefined)
    } catch {
      /* extension reloaded */
    }
  }
  pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    send(session?.phase === 'paused' ? 'RECORDER_RESUME' : 'RECORDER_PAUSE')
  })
  stopBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    send('RECORDER_STOP')
  })

  let drag: { dx: number; dy: number } | null = null
  pill.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    const rect = host.getBoundingClientRect()
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    pill.setPointerCapture(e.pointerId)
  })
  pill.addEventListener('pointermove', (e) => {
    if (!drag) return
    host.style.right = 'auto'
    host.style.transform = 'none'
    host.style.left = `${Math.max(0, e.clientX - drag.dx)}px`
    host.style.top = `${Math.max(0, e.clientY - drag.dy)}px`
  })
  pill.addEventListener('pointerup', () => (drag = null))

  const update = (next: RecorderSession | null) => {
    session = next
    if (!next) {
      window.clearInterval(timer)
      host.remove()
      delete w.__tbxRecorderPill
      return
    }
    render()
  }
  w.__tbxRecorderPill = update
}

export function unmountRecorderCountdown(): void {
  document.getElementById(COUNTDOWN_HOST_ID)?.remove()
}

export { showRecorderCountdown } from './countdownInject'

/** Invisible extension frame whose getUserMedia call raises Chrome's own microphone prompt. */
export function mountMicPermissionFrame(src: string): void {
  document.getElementById('__tbx-recorder-mic-frame')?.remove()
  const frame = document.createElement('iframe')
  frame.id = '__tbx-recorder-mic-frame'
  frame.src = src
  frame.allow = 'microphone'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'all:initial;position:fixed;width:1px;height:1px;left:-10px;top:-10px;opacity:0;border:0;pointer-events:none'
  document.documentElement.appendChild(frame)
}

export function removeMicPermissionFrame(): void {
  document.getElementById('__tbx-recorder-mic-frame')?.remove()
}
