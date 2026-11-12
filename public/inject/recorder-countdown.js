/**
 * Pre-roll 3-2-1 overlay (isolated world). Seconds come from chrome.storage.session.
 * Must stay plain JS — never bundle for executeScript `func` serialization.
 */
;(async function () {
  const HOST_ID = 'toolbox-recorder-countdown'
  const SEC_KEY = 'tbxCountdownSeconds'

  const stored = await chrome.storage.session.get([SEC_KEY])
  const seconds = Number(stored[SEC_KEY]) || 3
  await chrome.storage.session.remove(SEC_KEY)

  document.getElementById(HOST_ID)?.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;margin:0;padding:0;border:none;' +
    'box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
    'background:rgba(0,0,0,.58);color:#fff;font-family:system-ui,sans-serif;pointer-events:none;opacity:1;visibility:visible'

  const number = document.createElement('div')
  number.setAttribute('role', 'status')
  number.setAttribute('aria-live', 'assertive')
  number.style.cssText =
    'font-size:96px;font-weight:700;line-height:1;margin:0;text-shadow:0 4px 24px rgba(0,0,0,.55);font-variant-numeric:tabular-nums;color:#fff'
  number.textContent = String(seconds)

  const caption = document.createElement('p')
  caption.textContent = 'Recording starts…'
  caption.style.cssText = 'margin:0;font-size:15px;font-weight:600;letter-spacing:.02em;color:#fff'

  host.append(number, caption)
  ;(document.body || document.documentElement).appendChild(host)

  let left = seconds
  const tick = function () {
    if (left <= 0) {
      host.remove()
      return
    }
    number.textContent = String(left)
    left -= 1
    window.setTimeout(tick, 1000)
  }
  tick()
})()
