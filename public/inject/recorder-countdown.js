/**
 * Pre-roll 3-2-1 overlay on the recorded page (isolated world).
 * Must stay plain JS — loaded via chrome.scripting.executeScript `files`.
 */
;(async function () {
  const HOST_ID = 'toolbox-recorder-countdown'
  const SEC_KEY = 'tbxCountdownSeconds'
  const CAPTION_KEY = 'tbxCountdownCaption'

  const stored = await chrome.storage.session.get([SEC_KEY, CAPTION_KEY])
  const seconds = Number(stored[SEC_KEY]) || 3
  const caption = stored[CAPTION_KEY] || 'Recording starts…'
  await chrome.storage.session.remove([SEC_KEY, CAPTION_KEY])

  document.getElementById(HOST_ID)?.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;margin:0;padding:0;border:none;' +
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
  number.textContent = String(seconds)

  ring.appendChild(number)

  const captionEl = document.createElement('p')
  captionEl.textContent = caption
  captionEl.style.cssText = 'margin:0;font-size:16px;font-weight:600;letter-spacing:.02em;color:#fff'

  const hint = document.createElement('p')
  hint.textContent = 'Screen recording'
  hint.style.cssText = 'margin:0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.75)'

  host.append(hint, ring, captionEl)
  ;(document.body || document.documentElement).appendChild(host)

  let left = seconds
  const pulse = () => {
    ring.style.transform = 'scale(1.08)'
    window.setTimeout(() => {
      ring.style.transform = 'scale(1)'
    }, 180)
  }
  pulse()

  const tick = function () {
    if (left <= 0) {
      number.textContent = '●'
      number.style.fontSize = '48px'
      number.style.color = '#ef4444'
      captionEl.textContent = 'Recording'
      window.setTimeout(() => host.remove(), 380)
      return
    }
    number.textContent = String(left)
    pulse()
    left -= 1
    window.setTimeout(tick, 1000)
  }
  window.setTimeout(tick, 1000)
})()