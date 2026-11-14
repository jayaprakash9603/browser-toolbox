/**
 * Pre-roll 3-2-1 overlay. Must stay fully synchronous — executeScript `files`
 * does not wait for an async IIFE, so awaiting storage looked like success with no UI.
 */
;(function () {
  const HOST_ID = 'toolbox-recorder-countdown'
  const g = globalThis
  let remaining =
    typeof g.__tbxCountdownSeconds === 'number' && g.__tbxCountdownSeconds > 0
      ? Math.max(1, Math.min(9, Math.floor(g.__tbxCountdownSeconds)))
      : 3
  let caption =
    typeof g.__tbxCountdownCaption === 'string' && g.__tbxCountdownCaption
      ? g.__tbxCountdownCaption
      : 'Recording starts…'
  try {
    g.__tbxCountdownSeconds = undefined
    g.__tbxCountdownCaption = undefined
  } catch (e) {}

  document.getElementById(HOST_ID)?.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  host.setAttribute('data-tbx-recorder-countdown', '1')
  host.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;margin:0;padding:0;border:none;' +
    'box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
    'background:rgba(0,0,0,.62);color:#fff;font-family:system-ui,sans-serif;pointer-events:none;opacity:1;visibility:visible'
  host.style.setProperty('z-index', '2147483647', 'important')
  host.style.setProperty('display', 'flex', 'important')
  host.style.setProperty('opacity', '1', 'important')
  host.style.setProperty('visibility', 'visible', 'important')

  const ring = document.createElement('div')
  ring.style.cssText =
    'width:128px;height:128px;border-radius:50%;border:4px solid rgba(239,68,68,.85);display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 0 0 12px rgba(239,68,68,.2);transition:transform .35s ease'

  const number = document.createElement('div')
  number.setAttribute('role', 'status')
  number.setAttribute('aria-live', 'assertive')
  number.style.cssText =
    'font-size:72px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.5)'
  number.textContent = String(remaining)
  ring.appendChild(number)

  const captionEl = document.createElement('p')
  captionEl.textContent = caption
  captionEl.style.cssText = 'margin:0;font-size:16px;font-weight:600;letter-spacing:.02em;color:#fff'

  const hint = document.createElement('p')
  hint.textContent = 'Screen recording'
  hint.style.cssText =
    'margin:0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75)'

  host.append(hint, ring, captionEl)
  const full = document.fullscreenElement
  const root = full && full.nodeType === 1 && full.nodeName !== 'VIDEO' && full.nodeName !== 'IFRAME' ? full : document.documentElement
  try {
    root.appendChild(host)
  } catch (e) {
    document.documentElement.appendChild(host)
  }

  const pulse = function () {
    ring.style.transform = 'scale(1.08)'
    window.setTimeout(function () {
      ring.style.transform = 'scale(1)'
    }, 180)
  }
  pulse()

  const applyRemaining = function (n) {
    if (typeof n !== 'number' || n <= 0) return
    remaining = Math.max(1, Math.min(9, Math.floor(n)))
    number.textContent = String(remaining)
    pulse()
  }

  if (chrome.storage && chrome.storage.session) {
    chrome.storage.session.get(['tbxCountdownSeconds', 'tbxCountdownCaption'], function (got) {
      if (!host.isConnected) return
      if (got && typeof got.tbxCountdownSeconds === 'number') applyRemaining(got.tbxCountdownSeconds)
      if (got && typeof got.tbxCountdownCaption === 'string' && got.tbxCountdownCaption) {
        captionEl.textContent = got.tbxCountdownCaption
      }
    })
  }

  const tick = function () {
    if (!host.isConnected) return
    remaining -= 1
    if (remaining <= 0) {
      host.remove()
      return
    }
    number.textContent = String(remaining)
    pulse()
    window.setTimeout(tick, 1000)
  }
  window.setTimeout(tick, 1000)
})()
