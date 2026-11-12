/**
 * Page + screen color pick (isolated world). Options via window.__TBX_COLOR_PICK__ from a tiny bootstrap inject.
 * Plain JS only — do not bundle for executeScript `func`.
 */
;(function () {
  var opts = window.__TBX_COLOR_PICK__
  delete window.__TBX_COLOR_PICK__
  if (!opts || !opts.text) return

  var HOST_ID = 'tbx-color-picker-host'
  var RESULT_ID = 'tbx-color-result-host'
  var pickAgain = {
    page: function () {
      chrome.runtime.sendMessage({ type: 'COLOR_PICK_START' }).catch(function () {})
    },
    screen: function () {
      chrome.runtime.sendMessage({ type: 'COLOR_PICK_SCREEN' }).catch(function () {})
    },
  }
  var FORMATS = ['hex', 'rgb', 'hsl', 'hsv']
  var ZOOMS = [5, 7, 9, 11, 15, 21]
  var LOUPE = 132
  var SHADE_L = [20, 30, 40, 50, 60, 70, 80, 90, 96]

  function toHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0') }).join('')
  }

  function toHsl(r, g, b) {
    var rn = r / 255, gn = g / 255, bn = b / 255
    var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    var l = (max + min) / 2, d = max - min, h = 0, s = 0
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return 'hsl(' + Math.round(h) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)'
  }

  function toHsv(r, g, b) {
    var rn = r / 255, gn = g / 255, bn = b / 255
    var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min, h = 0
    var s = max === 0 ? 0 : d / max
    if (d !== 0) {
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return 'hsv(' + Math.round(h) + ', ' + Math.round(s * 100) + '%, ' + Math.round(max * 100) + '%)'
  }

  function formatValue(format, r, g, b) {
    if (format === 'rgb') return 'rgb(' + r + ', ' + g + ', ' + b + ')'
    if (format === 'hsl') return toHsl(r, g, b)
    if (format === 'hsv') return toHsv(r, g, b)
    return toHex(r, g, b)
  }

  function rgbToHslParts(r, g, b) {
    var rn = r / 255, gn = g / 255, bn = b / 255
    var max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    var l = (max + min) / 2, d = max - min, h = 0, s = 0
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return { h: h, s: s * 100, l: l * 100 }
  }

  function hslToRgb(h, s, l) {
    var sn = s / 100, ln = l / 100
    var c = (1 - Math.abs(2 * ln - 1)) * sn
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    var m = ln - c / 2, rp = 0, gp = 0, bp = 0
    if (h < 60) { rp = c; gp = x }
    else if (h < 120) { rp = x; gp = c }
    else if (h < 180) { gp = c; bp = x }
    else if (h < 240) { gp = x; bp = c }
    else if (h < 300) { rp = x; bp = c }
    else { rp = c; bp = x }
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255),
    }
  }

  function computeShades(r, g, b) {
    var parts = rgbToHslParts(r, g, b), seen = {}, out = []
    for (var i = 0; i < SHADE_L.length; i++) {
      var rgb = hslToRgb(parts.h, parts.s, SHADE_L[i])
      var shade = toHex(rgb.r, rgb.g, rgb.b)
      if (seen[shade]) continue
      seen[shade] = 1
      out.push(shade)
    }
    return out
  }

  function parseHex(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
    if (!m) return null
    var n = parseInt(m[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }

  function copyTextSync(text) {
    try {
      var area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;'
      document.documentElement.appendChild(area)
      area.focus()
      area.select()
      area.setSelectionRange(0, text.length)
      var ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch (e) {
      return false
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true }).catch(function () {
        return copyTextSync(text)
      })
    }
    return Promise.resolve(copyTextSync(text))
  }

  function copyFromUserGesture(text, onResult) {
    var done = function (ok) {
      if (onResult) onResult(ok)
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true) }).catch(function () {
          done(copyTextSync(text))
        })
        return
      }
    } catch (e) {
      /* fall through */
    }
    done(copyTextSync(text))
  }

  function mountResultPanel(text, r, g, b, pickedFormat, copied) {
    var prev = document.getElementById(RESULT_ID)
    if (prev) prev.remove()

    var activeR = r, activeG = g, activeB = b, activeFormat = pickedFormat
    var host = document.createElement('div')
    host.id = RESULT_ID
    host.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;pointer-events:none;max-width:min(400px,calc(100vw - 24px));'

    var sh = host.attachShadow({ mode: 'open' })
    sh.innerHTML =
      '<style>' +
      ':host{all:initial}*{box-sizing:border-box}' +
      '.card{pointer-events:auto;width:100%;padding:12px;border-radius:14px;font:500 12px/1.35 system-ui,sans-serif;' +
      'color:#f4f4f5;background:rgba(22,22,26,.96);border:1px solid rgba(255,255,255,.14);' +
      'box-shadow:0 16px 48px rgba(0,0,0,.45)}' +
      '.head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;cursor:grab;touch-action:none;user-select:none}' +
      '.head:active{cursor:grabbing}' +
      '.title{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;opacity:.8;flex:1;min-width:0}' +
      '.head-actions{display:flex;align-items:center;gap:2px;flex:none}' +
      '.icon-btn{border:0;background:transparent;color:inherit;cursor:pointer;opacity:.72;padding:6px;border-radius:8px;display:grid;place-items:center}' +
      '.icon-btn:hover{opacity:1;background:rgba(255,255,255,.1)}' +
      '.icon-btn svg{width:16px;height:16px;display:block}' +
      '.close{border:0;background:transparent;color:inherit;font-size:20px;line-height:1;cursor:pointer;opacity:.7;padding:2px 8px;border-radius:6px}' +
      '.close:hover{opacity:1;background:rgba(255,255,255,.08)}' +
      '.main{display:flex;align-items:center;gap:10px;margin-bottom:8px}' +
      '.sw{width:48px;height:48px;border-radius:10px;flex:none;background:var(--c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}' +
      '.value-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}' +
      '.val-row{display:flex;align-items:flex-start;gap:6px}' +
      '.val-row .val{flex:1;min-width:0}' +
      '.copy-inline{margin-top:0;flex:none;flex-shrink:0}' +
      '.icon-btn.copied{opacity:1;color:#86efac;background:rgba(134,239,172,.15)}' +
      '.val{font:600 14px/1.25 ui-monospace,monospace;word-break:break-all}' +
      '.status{min-height:14px;font-size:11px;font-weight:600;color:#86efac}' +
      '.status.fail{color:#fca5a5}' +
      '.status.idle{font-size:10px;font-weight:500;color:rgba(255,255,255,.45)}' +
      '.shades-label{margin:8px 0 6px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7}' +
      '.shades{display:flex;gap:5px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}' +
      '.shade{width:34px;height:34px;flex:none;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.22);padding:0}' +
      '.shade[data-active="true"]{outline:2px solid #fff;outline-offset:2px}' +
      '.actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
      '.btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:inherit;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer}' +
      '.btn[data-active="true"]{background:rgba(255,255,255,.2)}' +
      '.btn.palette{display:inline-flex;align-items:center;gap:6px;margin-top:8px;width:100%;justify-content:center;' +
      'background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(168,85,247,.2));border-color:rgba(129,140,248,.4)}' +
      '.btn.palette svg{width:16px;height:16px;flex:none}' +
      '@media (prefers-color-scheme:light){.card{color:#18181b;background:rgba(255,255,255,.97);border-color:rgba(0,0,0,.1);box-shadow:0 16px 48px rgba(0,0,0,.15)}' +
      '.shade{border-color:rgba(0,0,0,.12)}.shade[data-active="true"]{outline-color:#111}}' +
      '</style>' +
      '<div class="card" role="dialog">' +
      '<div class="head"><span class="title"></span><div class="head-actions">' +
      '<button type="button" class="icon-btn" data-action="copy-again" aria-label=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>' +
      '<button type="button" class="icon-btn" data-action="pick-page" aria-label=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="m2 22 1-1h3l9-9"/><path d="M15 6l3.29-3.29a1 1 0 0 1 1.41 0l2.59 2.59a1 1 0 0 1 0 1.41L19 9"/><path d="m11.5 10.5 7.3 7.3"/></svg></button>' +
      '<button type="button" class="icon-btn" data-action="pick-screen" aria-label=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg></button>' +
      '<button type="button" class="close" data-action="close" aria-label="Close">×</button></div></div>' +
      '<div class="main"><span class="sw"></span><div class="value-col">' +
      '<div class="val-row"><div class="val"></div>' +
      '<button type="button" class="icon-btn copy-inline" data-action="copy-again-inline" aria-label=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>' +
      '<div class="status"></div></div></div>' +
      '<div class="shades-label"></div><div class="shades"></div>' +
      '<div class="actions">' +
      '<button type="button" class="btn" data-format="hex"></button>' +
      '<button type="button" class="btn" data-format="rgb"></button>' +
      '<button type="button" class="btn" data-format="hsl"></button>' +
      '<button type="button" class="btn" data-format="hsv"></button>' +
      '</div>' +
      '<button type="button" class="btn palette" data-action="palette">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/>' +
      '<circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/>' +
      '<path d="M12 22a10 10 0 0 0 10-10c0-4-3-6-6-8-1.5 3-4.5 5-7 5.5"/></svg>' +
      '<span class="palette-label"></span></button></div>'

    sh.querySelector('.title').textContent = text.resultTitle
    sh.querySelector('.shades-label').textContent = text.shadesLabel
    sh.querySelector('.palette-label').textContent = text.generatePalette
    sh.querySelector('[data-action="copy-again"]').setAttribute('aria-label', text.copyAgain || 'Copy again')
    sh.querySelector('[data-action="pick-page"]').setAttribute('aria-label', text.pickPageAgain || 'Pick from page again')
    sh.querySelector('[data-action="pick-screen"]').setAttribute('aria-label', text.pickScreenAgain || 'Pick from screen again')
    sh.querySelector('[data-action="copy-again-inline"]').setAttribute('aria-label', text.copyAgain || 'Copy again')
    var pickScreenBtn = sh.querySelector('[data-action="pick-screen"]')
    if (!window.EyeDropper) pickScreenBtn.style.display = 'none'
    var valEl = sh.querySelector('.val')
    var statusEl = sh.querySelector('.status')
    var swEl = sh.querySelector('.sw')
    var card = sh.querySelector('.card')

    function refresh() {
      var hex = toHex(activeR, activeG, activeB)
      card.style.setProperty('--c', hex)
      swEl.style.background = hex
      valEl.textContent = formatValue(activeFormat, activeR, activeG, activeB)
    }

    var copyHeaderBtn = sh.querySelector('[data-action="copy-again"]')
    var copyInlineBtn = sh.querySelector('[data-action="copy-again-inline"]')

    function setStatus(ok, fromClick) {
      statusEl.classList.remove('idle', 'fail')
      if (fromClick === false && ok === null) {
        statusEl.textContent = text.copyAgain || 'Copy'
        statusEl.classList.add('idle')
        return
      }
      statusEl.textContent = ok ? text.copied : text.copyFailed
      statusEl.classList.toggle('fail', !ok)
      var glow = Boolean(ok)
      copyHeaderBtn.classList.toggle('copied', glow)
      copyInlineBtn.classList.toggle('copied', glow)
      if (glow) {
        window.setTimeout(function () {
          copyHeaderBtn.classList.remove('copied')
          copyInlineBtn.classList.remove('copied')
        }, 1400)
      }
    }

    function runCopyAgain(e) {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      var value = formatValue(activeFormat, activeR, activeG, activeB)
      copyFromUserGesture(value, function (ok) {
        setStatus(ok, true)
      })
    }

    copyHeaderBtn.addEventListener('click', runCopyAgain)
    copyInlineBtn.addEventListener('click', runCopyAgain)
    sh.querySelector('[data-action="pick-page"]').addEventListener('click', function (e) {
      e.stopPropagation()
      dismiss()
      pickAgain.page()
    })
    sh.querySelector('[data-action="pick-screen"]').addEventListener('click', function (e) {
      e.stopPropagation()
      dismiss()
      pickAgain.screen()
    })

    var labels = { hex: text.copyHex, rgb: text.copyRgb, hsl: text.copyHsl, hsv: text.copyHsv }
    var fmtBtns = sh.querySelectorAll('.btn[data-format]')
    for (var fi = 0; fi < fmtBtns.length; fi++) {
      ;(function (btn) {
        var fmt = btn.getAttribute('data-format') || 'hex'
        btn.textContent = labels[fmt] || fmt
        btn.dataset.active = fmt === pickedFormat ? 'true' : 'false'
        btn.addEventListener('click', function () {
          activeFormat = fmt
          for (var j = 0; j < fmtBtns.length; j++) fmtBtns[j].dataset.active = fmtBtns[j] === btn ? 'true' : 'false'
          refresh()
          copyFromUserGesture(formatValue(activeFormat, activeR, activeG, activeB), function (ok) {
            setStatus(ok, true)
          })
        })
      })(fmtBtns[fi])
    }

    var shadesEl = sh.querySelector('.shades')
    function renderShades() {
      shadesEl.textContent = ''
      var shades = computeShades(activeR, activeG, activeB)
      var activeHex = toHex(activeR, activeG, activeB)
      for (var si = 0; si < shades.length; si++) {
        ;(function (shade) {
          var sw = document.createElement('button')
          sw.type = 'button'
          sw.className = 'shade'
          sw.dataset.active = shade === activeHex ? 'true' : 'false'
          sw.style.background = shade
          sw.title = shade
          sw.addEventListener('click', function () {
            var p = parseHex(shade)
            if (!p) return
            activeR = p.r; activeG = p.g; activeB = p.b
            renderShades()
            refresh()
            copyFromUserGesture(formatValue(activeFormat, activeR, activeG, activeB), function (ok) {
              setStatus(ok, true)
            })
          })
          shadesEl.appendChild(sw)
        })(shades[si])
      }
    }
    renderShades()
    refresh()
    setStatus(copied === undefined ? null : copied, false)

    sh.querySelector('[data-action="palette"]').addEventListener('click', function () {
      chrome.runtime
        .sendMessage({ type: 'COLOR_OPEN_PALETTE', hex: toHex(activeR, activeG, activeB) })
        .catch(function () {})
    })

    var dismiss = function () {
      window.removeEventListener('keydown', onKey, true)
      host.remove()
    }
    sh.querySelector('[data-action="close"]').addEventListener('click', dismiss)
    var onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); dismiss() }
    }
    window.addEventListener('keydown', onKey, true)

    var head = sh.querySelector('.head')
    var drag = false, offX = 0, offY = 0
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-action="close"], .icon-btn')) return
      drag = true
      head.setPointerCapture(e.pointerId)
      var rect = host.getBoundingClientRect()
      host.style.right = 'auto'
      host.style.bottom = 'auto'
      host.style.left = rect.left + 'px'
      host.style.top = rect.top + 'px'
      offX = e.clientX - rect.left
      offY = e.clientY - rect.top
    })
    head.addEventListener('pointermove', function (e) {
      if (!drag) return
      host.style.left = Math.max(8, Math.min(window.innerWidth - host.offsetWidth - 8, e.clientX - offX)) + 'px'
      host.style.top = Math.max(8, Math.min(window.innerHeight - host.offsetHeight - 8, e.clientY - offY)) + 'px'
    })
    head.addEventListener('pointerup', function () { drag = false })
    head.addEventListener('pointercancel', function () { drag = false })

    document.documentElement.appendChild(host)
  }

  function finishPick(r, g, b, format) {
    var hex = toHex(r, g, b)
    mountResultPanel(opts.text, r, g, b, format, undefined)
    chrome.runtime.sendMessage({ type: 'COLOR_PICKED', hex: hex, format: format, url: location.href }).catch(function () {})
  }

  function startScreen() {
    var Eye = window.EyeDropper
    if (!Eye) return
    new Eye()
      .open()
      .then(function (result) {
        var rgb = parseHex(result.sRGBHex)
        if (!rgb) return
        var fmt = FORMATS.indexOf(opts.format) >= 0 ? opts.format : 'hex'
        finishPick(rgb.r, rgb.g, rgb.b, fmt)
      })
      .catch(function () {})
  }

  function startPage() {
    var prev = document.getElementById(HOST_ID)
    if (prev && prev.__dispose) prev.__dispose()
    if (prev) prev.remove()

    var text = opts.text
    var img = new Image()
    img.decoding = 'async'
    img.onerror = function () {}
    img.onload = function () {
      var vw = window.innerWidth
      var vh = window.innerHeight
      var scaleX = img.naturalWidth / vw
      var scaleY = img.naturalHeight / vh
      var ratio = Math.min(window.devicePixelRatio || 1, 2)
      var formatIndex = Math.max(0, FORMATS.indexOf(opts.format))
      var zoomIndex = 3
      var x = vw / 2
      var y = vh / 2
      var current = { r: 0, g: 0, b: 0 }
      var frame = 0
      var wheelAcc = 0
      var hintTimer = 0

      var host = document.createElement('div')
      host.id = HOST_ID
      host.style.cssText =
        'position:fixed;left:0;top:0;width:' + vw + 'px;height:' + vh + 'px;z-index:2147483646;pointer-events:none;'
      var shadow = host.attachShadow({ mode: 'open' })
      shadow.innerHTML =
        '<style>:host{all:initial}*{box-sizing:border-box}' +
        '.root{position:absolute;inset:0;cursor:none;touch-action:none;user-select:none;outline:none;' +
        'font:500 12px/1.2 system-ui,sans-serif;pointer-events:auto;background:transparent}' +
        '.loupe{position:absolute;left:0;top:0;width:' + LOUPE + 'px;pointer-events:none;display:flex;flex-direction:column;' +
        'align-items:center;gap:10px;will-change:transform}' +
        '.lens{width:' + LOUPE + 'px;height:' + LOUPE + 'px;border-radius:50%;overflow:hidden;background:#111;' +
        'box-shadow:0 0 0 3px var(--c,#fff),0 0 0 5px rgba(255,255,255,.92),0 10px 28px rgba(0,0,0,.4)}' +
        '.lens canvas{width:100%;height:100%;display:block}' +
        '.chip{display:flex;align-items:center;gap:7px;padding:5px 10px 5px 6px;border-radius:999px;' +
        'background:rgba(20,20,24,.9);color:#fafafa;border:1px solid rgba(255,255,255,.12);' +
        'box-shadow:0 6px 18px rgba(0,0,0,.35);white-space:nowrap}' +
        '.dot{width:16px;height:16px;border-radius:50%;background:var(--c,#fff);flex:none;' +
        'box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}' +
        '.val{font:600 12px/1 ui-monospace,monospace}' +
        '.fmt{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.6}' +
        '.hint{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;flex-wrap:wrap;' +
        'justify-content:center;gap:10px 12px;padding:7px 14px;border-radius:999px;' +
        'background:rgba(20,20,24,.88);color:#e4e4e7;border:1px solid rgba(255,255,255,.1);' +
        'box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;max-width:calc(100vw - 24px);' +
        'transition:opacity .3s ease,transform .3s ease}' +
        '.hint.off{opacity:0;transform:translateX(-50%) translateY(6px)}' +
        '.hint b{color:#fff;font-weight:700;margin-right:4px}' +
        '</style>' +
        '<div class="root" tabindex="-1" role="application" aria-label="' + (text.hintPick || 'Pick') + '">' +
        '<div class="loupe"><div class="lens"><canvas></canvas></div>' +
        '<div class="chip"><span class="dot"></span><span class="val"></span><span class="fmt"></span></div></div>' +
        '<div class="hint">' +
        '<span><b>Click</b>' + (text.hintPick || '') + '</span>' +
        '<span><b>Scroll</b>' + (text.hintZoom || '') + '</span>' +
        '<span><b>Tab</b>' + (text.hintFormat || '') + '</span>' +
        '<span><b>Shift</b>' + (text.hintKeep || '') + '</span>' +
        '<span><b>Esc</b>' + (text.hintExit || '') + '</span>' +
        '</div></div>'

      var root = shadow.querySelector('.root')
      var loupe = shadow.querySelector('.loupe')
      var lensCanvas = shadow.querySelector('.lens canvas')
      var valEl = shadow.querySelector('.val')
      var fmtEl = shadow.querySelector('.fmt')
      var chip = shadow.querySelector('.chip')
      var hint = shadow.querySelector('.hint')

      lensCanvas.width = Math.round(LOUPE * ratio)
      lensCanvas.height = Math.round(LOUPE * ratio)
      var lensCtx = lensCanvas.getContext('2d')
      lensCtx.imageSmoothingEnabled = false
      var probe = document.createElement('canvas')
      probe.width = 1
      probe.height = 1
      var probeCtx = probe.getContext('2d', { willReadFrequently: true })

      function clamp(v, a, b) { return Math.min(b, Math.max(a, v)) }

      function showHint() {
        hint.classList.remove('off')
        window.clearTimeout(hintTimer)
        hintTimer = window.setTimeout(function () { hint.classList.add('off') }, 4200)
      }

      function render() {
        frame = 0
        var px = clamp(Math.floor(x * scaleX), 0, img.naturalWidth - 1)
        var py = clamp(Math.floor(y * scaleY), 0, img.naturalHeight - 1)
        probeCtx.clearRect(0, 0, 1, 1)
        probeCtx.drawImage(img, px, py, 1, 1, 0, 0, 1, 1)
        var d = probeCtx.getImageData(0, 0, 1, 1).data
        current = { r: d[0], g: d[1], b: d[2] }
        var cells = ZOOMS[zoomIndex]
        var half = (cells - 1) / 2
        var size = lensCanvas.width
        lensCtx.fillStyle = '#111'
        lensCtx.fillRect(0, 0, size, size)
        lensCtx.drawImage(img, px - half, py - half, cells, cells, 0, 0, size, size)
        var cell = size / cells
        if (cells <= 15) {
          lensCtx.strokeStyle = 'rgba(0,0,0,.14)'
          lensCtx.lineWidth = 1
          lensCtx.beginPath()
          for (var i = 1; i < cells; i++) {
            var at = Math.round(i * cell) + 0.5
            lensCtx.moveTo(at, 0)
            lensCtx.lineTo(at, size)
            lensCtx.moveTo(0, at)
            lensCtx.lineTo(size, at)
          }
          lensCtx.stroke()
        }
        var mid = half * cell
        lensCtx.lineWidth = Math.max(2, ratio * 1.5)
        lensCtx.strokeStyle = '#fff'
        lensCtx.strokeRect(mid, mid, cell, cell)
        lensCtx.lineWidth = 1
        lensCtx.strokeStyle = '#000'
        lensCtx.strokeRect(mid + 1.5, mid + 1.5, cell - 3, cell - 3)
        var hex = toHex(current.r, current.g, current.b)
        loupe.style.setProperty('--c', hex)
        chip.style.setProperty('--c', hex)
        valEl.textContent = formatValue(FORMATS[formatIndex], current.r, current.g, current.b)
        fmtEl.textContent = FORMATS[formatIndex]
        var lx = clamp(x - LOUPE / 2, 8, vw - LOUPE - 8)
        var ly = clamp(y - LOUPE / 2, 8, vh - LOUPE - 52)
        loupe.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0)'
      }

      function schedule() { if (!frame) frame = requestAnimationFrame(render) }
      function setPoint(nx, ny) {
        x = clamp(nx, 0, vw - 1)
        y = clamp(ny, 0, vh - 1)
        showHint()
        schedule()
      }

      function close() {
        if (frame) cancelAnimationFrame(frame)
        window.clearTimeout(hintTimer)
        window.removeEventListener('keydown', onKey, true)
        host.remove()
      }
      host.__dispose = close

      function pick(keep) {
        render()
        finishPick(current.r, current.g, current.b, FORMATS[formatIndex])
        if (!keep) close()
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close() }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e.shiftKey) }
        else if (e.key === 'Tab' || e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          formatIndex = (formatIndex + (e.shiftKey ? -1 : 1) + FORMATS.length) % FORMATS.length
          showHint()
          schedule()
        } else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
          e.preventDefault()
          zoomIndex = clamp(zoomIndex + (e.key === '+' || e.key === '=' ? -1 : 1), 0, ZOOMS.length - 1)
          showHint()
          schedule()
        }
      }

      root.addEventListener('pointermove', function (e) { setPoint(e.clientX, e.clientY) }, { passive: true })
      root.addEventListener('click', function (e) { e.preventDefault(); setPoint(e.clientX, e.clientY); pick(e.shiftKey) })
      root.addEventListener('contextmenu', function (e) { e.preventDefault(); close() })
      root.addEventListener('wheel', function (e) {
        e.preventDefault()
        wheelAcc += e.deltaY
        if (Math.abs(wheelAcc) < 40) return
        zoomIndex = clamp(zoomIndex + (wheelAcc > 0 ? 1 : -1), 0, ZOOMS.length - 1)
        wheelAcc = 0
        showHint()
        schedule()
      }, { passive: false })
      window.addEventListener('keydown', onKey, true)
      document.documentElement.appendChild(host)
      root.focus({ preventScroll: true })
      showHint()
      render()
    }
    img.src = opts.image
  }

  function beginPagePick() {
    if (!opts.forceLoupe && window.EyeDropper) {
      startScreen()
      return
    }
    if (opts.image) {
      startPage()
      return
    }
    chrome.runtime.sendMessage({ type: 'COLOR_PICK_LOUPE' }).catch(function () {})
  }

  pickAgain.page = beginPagePick
  pickAgain.screen = startScreen

  if (opts.mode === 'screen') startScreen()
  else if (opts.mode === 'page') beginPagePick()
})()
