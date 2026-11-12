const COUNTDOWN_HOST_ID = 'toolbox-recorder-countdown'

/** Remove any legacy in-page recorder UI left from older versions. */
export function unmountRecorderPill(): void {
  document.getElementById('toolbox-recorder-pill')?.remove()
  document.getElementById(COUNTDOWN_HOST_ID)?.remove()
  type PillWindow = Window & { __tbxRecorderPill?: unknown }
  delete (window as PillWindow).__tbxRecorderPill
}

/**
 * Full-page 3-2-1 overlay injected into the page before recording starts.
 * Must stay self-contained — Chrome serializes this for `scripting.executeScript`.
 */
export function showRecorderCountdown(seconds: number): void {
  document.getElementById(COUNTDOWN_HOST_ID)?.remove()
  const host = document.createElement('div')
  host.id = COUNTDOWN_HOST_ID
  host.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.42);' +
    'pointer-events:none;font-family:system-ui,sans-serif;color:#fff'
  const number = document.createElement('div')
  number.setAttribute('role', 'status')
  number.setAttribute('aria-live', 'assertive')
  number.style.cssText =
    'font-size:96px;font-weight:700;line-height:1;text-shadow:0 4px 24px rgba(0,0,0,.55);font-variant-numeric:tabular-nums'
  const caption = document.createElement('p')
  caption.textContent = 'Recording starts…'
  caption.style.cssText = 'margin:0;font-size:15px;font-weight:600;letter-spacing:.02em;opacity:.9'
  host.append(number, caption)
  document.documentElement.appendChild(host)

  let left = seconds
  const tick = () => {
    if (left <= 0) {
      host.remove()
      return
    }
    number.textContent = String(left)
    left -= 1
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
