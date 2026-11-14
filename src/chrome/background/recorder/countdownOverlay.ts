/**
 * Injected into the recorded tab with chrome.scripting.executeScript.
 * Only arguments cross over — nothing in these functions may close over module bindings.
 */

export function mountRecorderCountdownOverlay(seconds: number, caption: string): { mounted: true } {
  const HOST_ID = 'toolbox-recorder-countdown'
  document.getElementById(HOST_ID)?.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;margin:0;padding:0;border:none;' +
    'box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
    'background:rgba(0,0,0,.62);color:#fff;font-family:system-ui,sans-serif;pointer-events:none;opacity:1;visibility:visible'

  const ring = document.createElement('div')
  ring.style.cssText =
    'width:128px;height:128px;border-radius:50%;border:4px solid rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 0 0 12px rgba(239,68,68,.2);transition:transform .35s ease'

  const number = document.createElement('div')
  number.setAttribute('role', 'status')
  number.setAttribute('aria-live', 'assertive')
  number.style.cssText =
    'font-size:72px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.5)'
  const total = Number(seconds) > 0 ? Math.floor(Number(seconds)) : 3
  number.textContent = String(total)
  ring.appendChild(number)

  const captionEl = document.createElement('p')
  captionEl.textContent = caption || 'Recording starts…'
  captionEl.style.cssText = 'margin:0;font-size:16px;font-weight:600;letter-spacing:.02em;color:#fff'

  const hint = document.createElement('p')
  hint.textContent = 'Screen recording'
  hint.style.cssText =
    'margin:0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75)'

  host.append(hint, ring, captionEl)
  const full = document.fullscreenElement
  try {
    ;(full || document.documentElement).appendChild(host)
  } catch {
    document.documentElement.appendChild(host)
  }

  const pulse = () => {
    ring.style.transform = 'scale(1.08)'
    window.setTimeout(() => {
      ring.style.transform = 'scale(1)'
    }, 180)
  }
  pulse()

  let left = total
  const tick = () => {
    if (!host.isConnected) return
    left -= 1
    if (left <= 0) {
      host.remove()
      return
    }
    number.textContent = String(left)
    pulse()
    window.setTimeout(tick, 1000)
  }
  window.setTimeout(tick, 1000)
  return { mounted: true }
}

export function unmountRecorderCountdownOverlay(): void {
  document.getElementById('toolbox-recorder-countdown')?.remove()
}
