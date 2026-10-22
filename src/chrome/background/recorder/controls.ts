import type { RecorderSession } from '@/core/recorder/types'

/**
 * Runs in the recorded tab (isolated world). Builds a small draggable control pill in a
 * shadow root and listens for RECORDER_STATE broadcasts to keep the timer in sync.
 */
export function mountRecorderPill(initial: RecorderSession): void {
  const HOST_ID = 'toolbox-recorder-pill'
  type PillWindow = Window & { __tbxRecorderPill?: (s: RecorderSession | null) => void }
  const w = window as PillWindow
  if (w.__tbxRecorderPill) {
    w.__tbxRecorderPill(initial)
    return
  }

  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText = 'all:initial;position:fixed;left:16px;bottom:16px;z-index:2147483647;'
  const root = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = `
    .pill{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;
      background:rgba(17,17,17,.88);color:#fff;font:600 12px/1 system-ui,sans-serif;
      box-shadow:0 4px 16px rgba(0,0,0,.35);cursor:grab;user-select:none}
    .dot{width:10px;height:10px;border-radius:50%;background:#ef4444}
    .paused .dot{background:#f59e0b}
    .time{min-width:40px;font-variant-numeric:tabular-nums}
    button{all:unset;cursor:pointer;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.14)}
    button:hover{background:rgba(255,255,255,.26)}
    button.stop{background:#ef4444}
  `
  const pill = document.createElement('div')
  pill.className = 'pill'
  const dot = document.createElement('span')
  dot.className = 'dot'
  const time = document.createElement('span')
  time.className = 'time'
  const pauseBtn = document.createElement('button')
  const stopBtn = document.createElement('button')
  stopBtn.className = 'stop'
  stopBtn.textContent = 'Stop'
  pill.append(dot, time, pauseBtn, stopBtn)
  root.append(style, pill)
  document.documentElement.appendChild(host)

  let session: RecorderSession | null = initial
  const elapsed = (s: RecorderSession) => {
    if (s.phase === 'pending' || !s.startedAt) return 0
    const end = s.phase === 'paused' ? s.pausedAt : Date.now()
    return Math.max(0, end - s.startedAt - s.pausedMs)
  }
  const fmt = (ms: number) => {
    const t = Math.floor(ms / 1000)
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  }
  const render = () => {
    if (!session) return
    pill.classList.toggle('paused', session.phase === 'paused')
    time.textContent = session.phase === 'pending' ? 'Starting' : fmt(elapsed(session))
    pauseBtn.textContent = session.phase === 'paused' ? 'Resume' : 'Pause'
    pauseBtn.style.display = session.phase === 'pending' ? 'none' : ''
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
    host.style.left = `${Math.max(0, e.clientX - drag.dx)}px`
    host.style.top = `${Math.max(0, e.clientY - drag.dy)}px`
    host.style.bottom = 'auto'
  })
  pill.addEventListener('pointerup', () => (drag = null))

  const update = (next: RecorderSession | null) => {
    session = next
    if (!next) {
      window.clearInterval(timer)
      chrome.runtime.onMessage.removeListener(onMessage)
      host.remove()
      delete w.__tbxRecorderPill
      return
    }
    render()
  }
  const onMessage = (msg: { type?: string; session?: RecorderSession | null }) => {
    if (msg?.type === 'RECORDER_STATE') update(msg.session ?? null)
  }
  chrome.runtime.onMessage.addListener(onMessage)
  w.__tbxRecorderPill = update
}

/** Full-page 3-2-1 overlay shown in the tab before tab recording starts. */
export function showRecorderCountdown(seconds: number): void {
  const overlay = document.createElement('div')
  overlay.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,.35);color:#fff;font:700 96px/1 system-ui,sans-serif;' +
    'pointer-events:none;text-shadow:0 4px 24px rgba(0,0,0,.5)'
  document.documentElement.appendChild(overlay)
  let left = seconds
  const tick = () => {
    if (left <= 0) {
      overlay.remove()
      return
    }
    overlay.textContent = String(left)
    left--
    window.setTimeout(tick, 1000)
  }
  tick()
}

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
