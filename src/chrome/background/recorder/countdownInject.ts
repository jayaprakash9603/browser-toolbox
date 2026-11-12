const COUNTDOWN_HOST_ID = 'toolbox-recorder-countdown'

/** Extension-page fallback when there is no return tab (pinned recorder tab only). */
export function showRecorderCountdown(seconds: number): void {
  document.getElementById(COUNTDOWN_HOST_ID)?.remove()
  const host = document.createElement('div')
  host.id = COUNTDOWN_HOST_ID
  host.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.58);color:#fff;' +
    'font-family:system-ui,sans-serif;pointer-events:none'
  const number = document.createElement('div')
  number.style.cssText = 'font-size:96px;font-weight:700;font-variant-numeric:tabular-nums'
  const caption = document.createElement('p')
  caption.textContent = 'Recording starts…'
  caption.style.cssText = 'margin:0;font-size:15px;font-weight:600'
  host.append(number, caption)
  document.body.appendChild(host)
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

export const RECORDER_COUNTDOWN_JS = 'inject/recorder-countdown.js'
export const COUNTDOWN_SEC_KEY = 'tbxCountdownSeconds'
