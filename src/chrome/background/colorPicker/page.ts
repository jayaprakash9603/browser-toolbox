/**
 * Injected into the page with `chrome.scripting.executeScript`, so everything it needs lives inside
 * `runColorPicker` (no imports, no outer closures). It freezes the tab screenshot under a magnifier
 * loupe, copies the picked color, and leaves a compact toast at the top of the page.
 */

export interface ColorPickerPageText {
  copied: string
  copyFailed: string
  hintPick: string
  hintZoom: string
  hintFormat: string
  hintKeep: string
  hintExit: string
  resultTitle: string
  copyHex: string
  copyRgb: string
  copyHsl: string
  copyHsv: string
  close: string
  shadesLabel: string
  generatePalette: string
  copyAgain: string
  pickPageAgain: string
  pickScreenAgain: string
}

export interface ColorPickerPageOptions {
  /** PNG data URL of the visible tab. */
  image: string
  format: 'hex' | 'rgb' | 'hsl'
  text: ColorPickerPageText
}

export interface ColorPickerPageResult {
  ok: boolean
  error?: string
}

export function runColorPicker(options: ColorPickerPageOptions): Promise<ColorPickerPageResult> {
  const HOST_ID = 'tbx-color-picker-host'
  const RESULT_ID = 'tbx-color-result-host'
  const FORMATS = ['hex', 'rgb', 'hsl', 'hsv'] as const
  const ZOOMS = [5, 7, 9, 11, 15, 21]
  const LOUPE = 132
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  type Host = HTMLElement & { __dispose?: () => void }

  const previous = document.getElementById(HOST_ID) as Host | null
  if (previous) {
    // Pressing the shortcut again while picking cancels the pick.
    previous.__dispose?.()
    previous.remove()
    return Promise.resolve({ ok: true })
  }

  return new Promise<ColorPickerPageResult>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onerror = () => resolve({ ok: false, error: 'image' })
    img.onload = () => {
      try {
        start(img)
        resolve({ ok: true })
      } catch (error) {
        resolve({ ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
    img.src = options.image
  })

  function toHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  }

  function toHsl(r: number, g: number, b: number): string {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    const d = max - min
    let h = 0
    let s = 0
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
  }

  function toHsv(r: number, g: number, b: number): string {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    const s = max === 0 ? 0 : d / max
    if (d !== 0) {
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return `hsv(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(max * 100)}%)`
  }

  function formatValue(format: (typeof FORMATS)[number], r: number, g: number, b: number): string {
    if (format === 'rgb') return `rgb(${r}, ${g}, ${b})`
    if (format === 'hsl') return toHsl(r, g, b)
    if (format === 'hsv') return toHsv(r, g, b)
    return toHex(r, g, b)
  }

  const SHADE_L = [20, 30, 40, 50, 60, 70, 80, 90, 96]

  function rgbToHslParts(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    const d = max - min
    let h = 0
    let s = 0
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return { h, s: s * 100, l: l * 100 }
  }

  function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const sn = s / 100
    const ln = l / 100
    const c = (1 - Math.abs(2 * ln - 1)) * sn
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = ln - c / 2
    let rp = 0
    let gp = 0
    let bp = 0
    if (h < 60) [rp, gp, bp] = [c, x, 0]
    else if (h < 120) [rp, gp, bp] = [x, c, 0]
    else if (h < 180) [rp, gp, bp] = [0, c, x]
    else if (h < 240) [rp, gp, bp] = [0, x, c]
    else if (h < 300) [rp, gp, bp] = [x, 0, c]
    else [rp, gp, bp] = [c, 0, x]
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255),
    }
  }

  function computeShades(r: number, g: number, b: number): string[] {
    const { h, s } = rgbToHslParts(r, g, b)
    const seen = new Set<string>()
    return SHADE_L.map((light) => {
      const { r: sr, g: sg, b: sb } = hslToRgb(h, s, light)
      return toHex(sr, sg, sb)
    }).filter((shade) => {
      if (seen.has(shade)) return false
      seen.add(shade)
      return true
    })
  }

  function start(source: HTMLImageElement): void {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scaleX = source.naturalWidth / vw
    const scaleY = source.naturalHeight / vh
    const ratio = Math.min(window.devicePixelRatio || 1, 2)

    let formatIndex = Math.max(0, FORMATS.indexOf(options.format))
    let zoomIndex = 3
    let x = vw / 2
    let y = vh / 2
    let current = { r: 0, g: 0, b: 0 }
    let frame = 0
    let wheelAcc = 0
    let hintTimer = 0

    const host = document.createElement('div') as Host
    host.id = HOST_ID
    host.style.cssText = `position:fixed;left:0;top:0;width:${vw}px;height:${vh}px;z-index:2147483646;`
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .root { position:absolute; inset:0; cursor:none; touch-action:none; user-select:none; outline:none;
          font:500 12px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif; }
        .shot { position:absolute; inset:0; width:100%; height:100%; display:block; }
        .loupe { position:absolute; left:0; top:0; width:${LOUPE}px; display:flex; flex-direction:column;
          align-items:center; gap:10px; will-change:transform; pointer-events:none; }
        .lens { position:relative; width:${LOUPE}px; height:${LOUPE}px; border-radius:50%; overflow:hidden;
          background:#111; box-shadow:0 0 0 3px var(--c,#fff), 0 0 0 5px rgba(255,255,255,.92), 0 10px 28px rgba(0,0,0,.4); }
        .lens canvas { width:100%; height:100%; display:block; }
        .chip { display:flex; align-items:center; gap:7px; padding:5px 10px 5px 6px; border-radius:999px;
          background:rgba(20,20,24,.9); color:#fafafa; box-shadow:0 6px 18px rgba(0,0,0,.35);
          border:1px solid rgba(255,255,255,.12); white-space:nowrap; }
        .dot { width:16px; height:16px; border-radius:50%; background:var(--c,#fff);
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.35); flex:none; }
        .val { font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing:.01em; }
        .fmt { font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; opacity:.6; }
        .hint { position:absolute; left:50%; bottom:18px; transform:translateX(-50%); display:flex; gap:12px;
          padding:7px 14px; border-radius:999px; background:rgba(20,20,24,.88); color:#e4e4e7;
          border:1px solid rgba(255,255,255,.1); box-shadow:0 8px 24px rgba(0,0,0,.35); white-space:nowrap;
          transition:opacity .3s ease, transform .3s ease; pointer-events:none; }
        .hint.off { opacity:0; transform:translateX(-50%) translateY(6px); }
        .hint b { color:#fff; font-weight:700; margin-right:4px; }
        @media (prefers-reduced-motion: reduce) { .hint { transition:none; } }
      </style>
      <div class="root" tabindex="-1" role="application" aria-label="${options.text.hintPick}">
        <canvas class="shot"></canvas>
        <div class="loupe">
          <div class="lens"><canvas></canvas></div>
          <div class="chip"><span class="dot"></span><span class="val"></span><span class="fmt"></span></div>
        </div>
        <div class="hint">
          <span><b>Click</b>${options.text.hintPick}</span>
          <span><b>Scroll</b>${options.text.hintZoom}</span>
          <span><b>Tab</b>${options.text.hintFormat}</span>
          <span><b>Shift</b>${options.text.hintKeep}</span>
          <span><b>Esc</b>${options.text.hintExit}</span>
        </div>
      </div>`

    const root = shadow.querySelector('.root') as HTMLElement
    const shot = shadow.querySelector('.shot') as HTMLCanvasElement
    const loupe = shadow.querySelector('.loupe') as HTMLElement
    const lens = shadow.querySelector('.lens') as HTMLElement
    const lensCanvas = lens.querySelector('canvas') as HTMLCanvasElement
    const chip = shadow.querySelector('.chip') as HTMLElement
    const valueEl = shadow.querySelector('.val') as HTMLElement
    const formatEl = shadow.querySelector('.fmt') as HTMLElement
    const hint = shadow.querySelector('.hint') as HTMLElement

    shot.width = source.naturalWidth
    shot.height = source.naturalHeight
    shot.getContext('2d')?.drawImage(source, 0, 0)

    lensCanvas.width = Math.round(LOUPE * ratio)
    lensCanvas.height = Math.round(LOUPE * ratio)
    const lensCtx = lensCanvas.getContext('2d') as CanvasRenderingContext2D
    lensCtx.imageSmoothingEnabled = false

    const probe = document.createElement('canvas')
    probe.width = 1
    probe.height = 1
    const probeCtx = probe.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D

    function clamp(value: number, min: number, max: number): number {
      return Math.min(max, Math.max(min, value))
    }

    function render(): void {
      frame = 0
      const px = clamp(Math.floor(x * scaleX), 0, source.naturalWidth - 1)
      const py = clamp(Math.floor(y * scaleY), 0, source.naturalHeight - 1)

      probeCtx.clearRect(0, 0, 1, 1)
      probeCtx.drawImage(source, px, py, 1, 1, 0, 0, 1, 1)
      const data = probeCtx.getImageData(0, 0, 1, 1).data
      current = { r: data[0], g: data[1], b: data[2] }

      const cells = ZOOMS[zoomIndex]
      const half = (cells - 1) / 2
      const size = lensCanvas.width
      lensCtx.fillStyle = '#111'
      lensCtx.fillRect(0, 0, size, size)
      lensCtx.drawImage(source, px - half, py - half, cells, cells, 0, 0, size, size)

      const cell = size / cells
      if (cells <= 15) {
        lensCtx.strokeStyle = 'rgba(0,0,0,.14)'
        lensCtx.lineWidth = 1
        lensCtx.beginPath()
        for (let i = 1; i < cells; i += 1) {
          const at = Math.round(i * cell) + 0.5
          lensCtx.moveTo(at, 0)
          lensCtx.lineTo(at, size)
          lensCtx.moveTo(0, at)
          lensCtx.lineTo(size, at)
        }
        lensCtx.stroke()
      }
      const mid = half * cell
      lensCtx.lineWidth = Math.max(2, ratio * 1.5)
      lensCtx.strokeStyle = '#fff'
      lensCtx.strokeRect(mid, mid, cell, cell)
      lensCtx.lineWidth = 1
      lensCtx.strokeStyle = '#000'
      lensCtx.strokeRect(mid + 1.5, mid + 1.5, cell - 3, cell - 3)

      const hex = toHex(current.r, current.g, current.b)
      loupe.style.setProperty('--c', hex)
      chip.style.setProperty('--c', hex)
      valueEl.textContent = formatValue(FORMATS[formatIndex], current.r, current.g, current.b)
      formatEl.textContent = FORMATS[formatIndex]

      // Keep the loupe (and its label) inside the viewport.
      const lx = clamp(x - LOUPE / 2, 8, vw - LOUPE - 8)
      const ly = clamp(y - LOUPE / 2, 8, vh - LOUPE - 52)
      loupe.style.transform = `translate3d(${lx}px, ${ly}px, 0)`
    }

    function schedule(): void {
      if (!frame) frame = requestAnimationFrame(render)
    }

    function setPoint(nextX: number, nextY: number): void {
      x = clamp(nextX, 0, vw - 1)
      y = clamp(nextY, 0, vh - 1)
      schedule()
    }

    function showHint(): void {
      hint.classList.remove('off')
      window.clearTimeout(hintTimer)
      hintTimer = window.setTimeout(() => hint.classList.add('off'), 4200)
    }

    function showResultPanel(r: number, g: number, b: number, pickedFormat: string, copied: boolean): void {
      const stale = document.getElementById(RESULT_ID) as Host | null
      stale?.__dispose?.()
      stale?.remove()

      const hex = toHex(r, g, b)
      const el = document.createElement('div') as Host
      el.id = RESULT_ID
      el.style.cssText =
        'position:fixed;left:0;right:0;top:12px;z-index:2147483647;display:flex;justify-content:center;pointer-events:none;'
      const sh = el.attachShadow({ mode: 'open' })
      sh.innerHTML = `
        <style>
          :host { all: initial; }
          * { box-sizing: border-box; }
          .card { pointer-events:auto; width:min(360px,calc(100vw - 24px)); padding:12px 12px 10px; border-radius:14px;
            font:500 12px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;
            color:#f4f4f5; background:rgba(22,22,26,.94); border:1px solid rgba(255,255,255,.12);
            box-shadow:0 14px 40px rgba(0,0,0,.38), 0 2px 8px rgba(0,0,0,.2);
            -webkit-backdrop-filter:blur(16px) saturate(170%); backdrop-filter:blur(16px) saturate(170%); }
          .head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
          .title { font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; opacity:.75; }
          .close { border:0; background:transparent; color:inherit; opacity:.65; cursor:pointer; font-size:18px; line-height:1; padding:2px 6px; border-radius:6px; }
          .close:hover { opacity:1; background:rgba(255,255,255,.08); }
          .main { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
          .sw { width:42px; height:42px; border-radius:10px; flex:none; background:var(--c); box-shadow:inset 0 0 0 1px rgba(255,255,255,.25); }
          .val { font:600 14px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; word-break:break-all; }
          .status { margin-top:4px; font-size:10.5px; font-weight:600; color:#86efac; }
          .status.fail { color:#fca5a5; }
          .actions { display:flex; flex-wrap:wrap; gap:6px; }
          .btn { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:inherit;
            border-radius:999px; padding:6px 10px; font-size:11px; font-weight:600; cursor:pointer; }
          .btn:hover { background:rgba(255,255,255,.12); }
          .btn[data-active="true"] { border-color:rgba(255,255,255,.28); background:rgba(255,255,255,.16); }
          .btn.palette { display:inline-flex; align-items:center; gap:6px; margin-top:8px; width:100%; justify-content:center;
            background:linear-gradient(135deg,rgba(99,102,241,.22),rgba(168,85,247,.18)); border-color:rgba(129,140,248,.35); }
          .btn.palette svg { width:15px; height:15px; flex:none; opacity:.95; }
          .shades-label { margin:10px 0 6px; font-size:10px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
          .shades { display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; scrollbar-width:thin; }
          .shade { width:30px; height:30px; flex:none; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,.2); }
          .shade[data-active="true"] { outline:2px solid #fff; outline-offset:2px; }
          @media (prefers-color-scheme: light) {
            .card { color:#18181b; background:rgba(255,255,255,.95); border-color:rgba(0,0,0,.08);
              box-shadow:0 14px 40px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.06); }
            .btn { border-color:rgba(0,0,0,.1); background:rgba(0,0,0,.04); }
            .btn:hover { background:rgba(0,0,0,.07); }
            .status { color:#15803d; }
            .status.fail { color:#b91c1c; }
            .shade { border-color:rgba(0,0,0,.12); }
            .shade[data-active="true"] { outline-color:#18181b; }
          }
        </style>
        <div class="card" role="dialog" aria-labelledby="tbx-color-result-title">
          <div class="head">
            <span class="title" id="tbx-color-result-title"></span>
            <button type="button" class="close" data-action="close" aria-label="Close">×</button>
          </div>
          <div class="main">
            <span class="sw"></span>
            <div>
              <div class="val"></div>
              <div class="status"></div>
            </div>
          </div>
          <div class="shades-label"></div>
          <div class="shades"></div>
          <div class="actions">
            <button type="button" class="btn" data-format="hex"></button>
            <button type="button" class="btn" data-format="rgb"></button>
            <button type="button" class="btn" data-format="hsl"></button>
            <button type="button" class="btn" data-format="hsv"></button>
          </div>
          <button type="button" class="btn palette" data-action="palette">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/>
              <circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/>
              <path d="M12 22a10 10 0 0 0 10-10c0-4-3-6-6-8-1.5 3-4.5 5-7 5.5"/>
            </svg>
            <span class="palette-label"></span>
          </button>
        </div>`

      const card = sh.querySelector('.card') as HTMLElement
      const statusEl = sh.querySelector('.status') as HTMLElement
      const valEl = sh.querySelector('.val') as HTMLElement
      ;(sh.querySelector('.title') as HTMLElement).textContent = options.text.resultTitle
      ;(sh.querySelector('.shades-label') as HTMLElement).textContent = options.text.shadesLabel
      ;(sh.querySelector('.palette-label') as HTMLElement).textContent = options.text.generatePalette
      card.style.setProperty('--c', hex)

      let activeR = r
      let activeG = g
      let activeB = b
      let activeFormat = pickedFormat

      const formatButtons = Array.from(sh.querySelectorAll<HTMLButtonElement>('.btn[data-format]'))
      const labels: Record<string, string> = {
        hex: options.text.copyHex,
        rgb: options.text.copyRgb,
        hsl: options.text.copyHsl,
        hsv: options.text.copyHsv,
      }

      const refreshValueDisplay = () => {
        const value = formatValue(activeFormat as (typeof FORMATS)[number], activeR, activeG, activeB)
        valEl.textContent = value
        card.style.setProperty('--c', toHex(activeR, activeG, activeB))
        ;(sh.querySelector('.sw') as HTMLElement).style.background = toHex(activeR, activeG, activeB)
      }

      const setCopiedStatus = (ok: boolean) => {
        statusEl.textContent = ok ? options.text.copied : options.text.copyFailed
        statusEl.classList.toggle('fail', !ok)
      }

      for (const button of formatButtons) {
        const fmt = button.dataset.format ?? 'hex'
        button.textContent = labels[fmt] ?? fmt.toUpperCase()
        button.dataset.active = fmt === pickedFormat ? 'true' : 'false'
        button.addEventListener('click', () => {
          activeFormat = fmt
          for (const peer of formatButtons) peer.dataset.active = peer === button ? 'true' : 'false'
          const value = formatValue(fmt as (typeof FORMATS)[number], activeR, activeG, activeB)
          valEl.textContent = value
          void copyText(value).then(setCopiedStatus)
        })
      }

      const shadesEl = sh.querySelector('.shades') as HTMLElement
      const renderShades = () => {
        shadesEl.replaceChildren()
        const shades = computeShades(activeR, activeG, activeB)
        const activeHex = toHex(activeR, activeG, activeB)
        for (const shade of shades) {
          const sw = document.createElement('button')
          sw.type = 'button'
          sw.className = 'shade'
          sw.dataset.active = shade === activeHex ? 'true' : 'false'
          sw.style.background = shade
          sw.title = shade
          sw.addEventListener('click', () => {
            const parsed = /^#?([0-9a-f]{6})$/i.exec(shade)
            if (!parsed) return
            const n = parseInt(parsed[1], 16)
            activeR = (n >> 16) & 255
            activeG = (n >> 8) & 255
            activeB = n & 255
            renderShades()
            refreshValueDisplay()
            void copyText(formatValue(activeFormat as (typeof FORMATS)[number], activeR, activeG, activeB)).then(
              setCopiedStatus,
            )
          })
          shadesEl.append(sw)
        }
      }
      renderShades()

      sh.querySelector('[data-action="palette"]')?.addEventListener('click', () => {
        const hexValue = toHex(activeR, activeG, activeB)
        chrome.runtime.sendMessage({ type: 'COLOR_OPEN_PALETTE', hex: hexValue }).catch(() => undefined)
      })

      refreshValueDisplay()
      statusEl.textContent = copied ? options.text.copied : options.text.copyFailed
      statusEl.classList.toggle('fail', !copied)

      const dismiss = () => {
        window.removeEventListener('keydown', onResultKey, true)
        el.remove()
      }
      el.__dispose = dismiss
      const onResultKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopImmediatePropagation()
          dismiss()
        }
      }
      sh.querySelector('[data-action="close"]')?.addEventListener('click', dismiss)
      window.addEventListener('keydown', onResultKey, true)
      document.documentElement.append(el)
      if (!reduced) {
        card.animate(
          [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 220, easing: 'cubic-bezier(.2,.9,.25,1.1)' },
        )
      }
    }

    // ── Actions ──────────────────────────────────────────────────────────────
    async function copyText(text: string): Promise<boolean> {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        try {
          const area = document.createElement('textarea')
          area.value = text
          area.style.cssText = 'position:fixed;opacity:0;pointer-events:none;'
          document.documentElement.append(area)
          area.select()
          const ok = document.execCommand('copy')
          area.remove()
          return ok
        } catch {
          return false
        }
      }
    }

    function close(): void {
      if (frame) cancelAnimationFrame(frame)
      window.clearTimeout(hintTimer)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('pagehide', close)
      host.remove()
    }
    host.__dispose = close

    function pick(keepOpen: boolean): void {
      render()
      const format = FORMATS[formatIndex]
      const value = formatValue(format, current.r, current.g, current.b)
      const hex = toHex(current.r, current.g, current.b)
      const copying = copyText(value)
      if (!reduced) {
        lens.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }],
          { duration: 220, easing: 'ease-out' },
        )
      }
      void copying.then((ok) => {
        showResultPanel(current.r, current.g, current.b, format, ok)
      })
      chrome.runtime
        .sendMessage({ type: 'COLOR_PICKED', hex, format, url: location.href })
        .catch(() => undefined)
      if (!keepOpen) close()
    }

    function cycleFormat(step: number): void {
      formatIndex = (formatIndex + step + FORMATS.length) % FORMATS.length
      schedule()
    }

    function onKey(event: KeyboardEvent): void {
      const handled = () => {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      switch (event.key) {
        case 'Escape':
          handled()
          close()
          return
        case 'Enter':
        case ' ':
          handled()
          pick(event.shiftKey)
          return
        case 'Tab':
        case 'f':
        case 'F':
          handled()
          cycleFormat(event.shiftKey ? -1 : 1)
          return
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          handled()
          const step = event.shiftKey ? 10 : 1
          const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
          const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
          setPoint(x + dx, y + dy)
          return
        }
        case '+':
        case '=':
        case '-':
        case '_': {
          handled()
          const delta = event.key === '+' || event.key === '=' ? -1 : 1
          zoomIndex = clamp(zoomIndex + delta, 0, ZOOMS.length - 1)
          schedule()
          return
        }
        default:
          if (!event.metaKey && !event.ctrlKey && !event.altKey) handled()
      }
    }

    root.addEventListener('pointermove', (event) => setPoint(event.clientX, event.clientY), { passive: true })
    root.addEventListener('click', (event) => {
      event.preventDefault()
      setPoint(event.clientX, event.clientY)
      pick(event.shiftKey)
    })
    root.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      close()
    })
    root.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
        wheelAcc += event.deltaY
        if (Math.abs(wheelAcc) < 40) return
        zoomIndex = clamp(zoomIndex + (wheelAcc > 0 ? 1 : -1), 0, ZOOMS.length - 1)
        wheelAcc = 0
        schedule()
      },
      { passive: false },
    )

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', close)
    window.addEventListener('pagehide', close)

    document.documentElement.append(host)
    render()
    root.focus({ preventScroll: true })
    if (!reduced) {
      loupe.animate(
        [
          { transform: `${loupe.style.transform} scale(.7)`, opacity: 0 },
          { transform: `${loupe.style.transform} scale(1)`, opacity: 1 },
        ],
        { duration: 200, easing: 'cubic-bezier(.2,.9,.25,1.2)' },
      )
    }
    showHint()
  }
}

type ScreenPickFormat = 'hex' | 'rgb' | 'hsl' | 'hsv'
type ScreenPickOptions = { format: ScreenPickFormat; text: ColorPickerPageText }

/** Native EyeDropper + the same copy-again result card as the page loupe picker. */
export function runScreenColorPick(options: ScreenPickOptions): Promise<ColorPickerPageResult> {
  const RESULT_ID = 'tbx-color-result-host'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  type Host = HTMLElement & { __dispose?: () => void }

  const EyeDropperCtor = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } })
    .EyeDropper
  if (!EyeDropperCtor) return Promise.resolve({ ok: false, error: 'eyedropper' })

  function toHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
  }

  function parseHex(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
    if (!m) return null
    const n = parseInt(m[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }

  function toHsl(r: number, g: number, b: number): string {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    const d = max - min
    let h = 0
    let s = 0
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
  }

  function toHsv(r: number, g: number, b: number): string {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const d = max - min
    let h = 0
    const s = max === 0 ? 0 : d / max
    if (d !== 0) {
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return `hsv(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(max * 100)}%)`
  }

  function formatValue(format: ScreenPickFormat, r: number, g: number, b: number): string {
    if (format === 'rgb') return `rgb(${r}, ${g}, ${b})`
    if (format === 'hsl') return toHsl(r, g, b)
    if (format === 'hsv') return toHsv(r, g, b)
    return toHex(r, g, b)
  }

  const SHADE_L = [20, 30, 40, 50, 60, 70, 80, 90, 96]

  function rgbToHslParts(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    const d = max - min
    let h = 0
    let s = 0
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
      else if (max === gn) h = (bn - rn) / d + 2
      else h = (rn - gn) / d + 4
      h *= 60
    }
    return { h, s: s * 100, l: l * 100 }
  }

  function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const sn = s / 100
    const ln = l / 100
    const c = (1 - Math.abs(2 * ln - 1)) * sn
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = ln - c / 2
    let rp = 0
    let gp = 0
    let bp = 0
    if (h < 60) [rp, gp, bp] = [c, x, 0]
    else if (h < 120) [rp, gp, bp] = [x, c, 0]
    else if (h < 180) [rp, gp, bp] = [0, c, x]
    else if (h < 240) [rp, gp, bp] = [0, x, c]
    else if (h < 300) [rp, gp, bp] = [x, 0, c]
    else [rp, gp, bp] = [c, 0, x]
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255),
    }
  }

  function computeShades(r: number, g: number, b: number): string[] {
    const { h, s } = rgbToHslParts(r, g, b)
    const seen = new Set<string>()
    return SHADE_L.map((light) => {
      const { r: sr, g: sg, b: sb } = hslToRgb(h, s, light)
      return toHex(sr, sg, sb)
    }).filter((shade) => {
      if (seen.has(shade)) return false
      seen.add(shade)
      return true
    })
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none;'
        document.documentElement.append(area)
        area.select()
        const ok = document.execCommand('copy')
        area.remove()
        return ok
      } catch {
        return false
      }
    }
  }

  function showResultPanel(r: number, g: number, b: number, pickedFormat: string, copied: boolean): void {
    document.getElementById(RESULT_ID)?.remove()
    const hex = toHex(r, g, b)
    const el = document.createElement('div') as Host
    el.id = RESULT_ID
    el.style.cssText =
      'position:fixed;left:0;right:0;top:12px;z-index:2147483647;display:flex;justify-content:center;pointer-events:none;'
    const sh = el.attachShadow({ mode: 'open' })
    sh.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .card { pointer-events:auto; width:min(360px,calc(100vw - 24px)); padding:12px; border-radius:14px;
          font:500 12px/1.35 system-ui,sans-serif; color:#f4f4f5; background:rgba(22,22,26,.94);
          border:1px solid rgba(255,255,255,.12); box-shadow:0 14px 40px rgba(0,0,0,.35); }
        .head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .title { font-size:11px; font-weight:600; text-transform:uppercase; opacity:.75; }
        .close { border:0; background:transparent; color:inherit; font-size:18px; cursor:pointer; opacity:.7; }
        .main { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
        .sw { width:42px; height:42px; border-radius:10px; background:var(--c); }
        .val { font:600 14px/1.2 ui-monospace,monospace; }
        .status { font-size:10.5px; color:#86efac; margin-top:4px; }
        .status.fail { color:#fca5a5; }
        .actions { display:flex; flex-wrap:wrap; gap:6px; }
        .btn { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.08); color:inherit;
          border-radius:999px; padding:6px 10px; font-size:11px; font-weight:600; cursor:pointer; }
        .btn[data-active="true"] { background:rgba(255,255,255,.18); }
        .btn.palette { display:inline-flex; align-items:center; gap:6px; margin-top:8px; width:100%; justify-content:center;
          background:linear-gradient(135deg,rgba(99,102,241,.22),rgba(168,85,247,.18)); border-color:rgba(129,140,248,.35); }
        .btn.palette svg { width:15px; height:15px; flex:none; }
        .shades-label { margin:10px 0 6px; font-size:10px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
        .shades { display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; }
        .shade { width:30px; height:30px; flex:none; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,.2); }
        .shade[data-active="true"] { outline:2px solid #fff; outline-offset:2px; }
      </style>
      <div class="card" role="dialog">
        <div class="head"><span class="title"></span><button type="button" class="close">×</button></div>
        <div class="main"><span class="sw"></span><div><div class="val"></div><div class="status"></div></div></div>
        <div class="shades-label"></div>
        <div class="shades"></div>
        <div class="actions">
          <button type="button" class="btn" data-format="hex"></button>
          <button type="button" class="btn" data-format="rgb"></button>
          <button type="button" class="btn" data-format="hsl"></button>
          <button type="button" class="btn" data-format="hsv"></button>
        </div>
        <button type="button" class="btn palette" data-action="palette">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/>
            <circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/>
            <path d="M12 22a10 10 0 0 0 10-10c0-4-3-6-6-8-1.5 3-4.5 5-7 5.5"/>
          </svg>
          <span class="palette-label"></span>
        </button>
      </div>`
    const card = sh.querySelector('.card') as HTMLElement
    card.style.setProperty('--c', hex)
    ;(sh.querySelector('.title') as HTMLElement).textContent = options.text.resultTitle
    ;(sh.querySelector('.shades-label') as HTMLElement).textContent = options.text.shadesLabel
    ;(sh.querySelector('.palette-label') as HTMLElement).textContent = options.text.generatePalette
    const valEl = sh.querySelector('.val') as HTMLElement
    const statusEl = sh.querySelector('.status') as HTMLElement
    let activeR = r
    let activeG = g
    let activeB = b
    let activeFormat = pickedFormat as ScreenPickFormat
    const labels: Record<string, string> = {
      hex: options.text.copyHex,
      rgb: options.text.copyRgb,
      hsl: options.text.copyHsl,
      hsv: options.text.copyHsv,
    }
    const setCopiedStatus = (ok: boolean) => {
      statusEl.textContent = ok ? options.text.copied : options.text.copyFailed
      statusEl.classList.toggle('fail', !ok)
    }
    const refreshValueDisplay = () => {
      valEl.textContent = formatValue(activeFormat, activeR, activeG, activeB)
      const h = toHex(activeR, activeG, activeB)
      card.style.setProperty('--c', h)
      ;(sh.querySelector('.sw') as HTMLElement).style.background = h
    }
    const buttons = Array.from(sh.querySelectorAll<HTMLButtonElement>('.btn[data-format]'))
    for (const button of buttons) {
      const fmt = button.dataset.format ?? 'hex'
      button.textContent = labels[fmt] ?? fmt
      button.dataset.active = fmt === pickedFormat ? 'true' : 'false'
      button.addEventListener('click', () => {
        activeFormat = fmt as ScreenPickFormat
        for (const peer of buttons) peer.dataset.active = peer === button ? 'true' : 'false'
        const value = formatValue(activeFormat, activeR, activeG, activeB)
        valEl.textContent = value
        void copyText(value).then(setCopiedStatus)
      })
    }
    const shadesEl = sh.querySelector('.shades') as HTMLElement
    const renderShades = () => {
      shadesEl.replaceChildren()
      const shades = computeShades(activeR, activeG, activeB)
      const activeHex = toHex(activeR, activeG, activeB)
      for (const shade of shades) {
        const sw = document.createElement('button')
        sw.type = 'button'
        sw.className = 'shade'
        sw.dataset.active = shade === activeHex ? 'true' : 'false'
        sw.style.background = shade
        sw.title = shade
        sw.addEventListener('click', () => {
          const parsed = parseHex(shade)
          if (!parsed) return
          activeR = parsed.r
          activeG = parsed.g
          activeB = parsed.b
          renderShades()
          refreshValueDisplay()
          void copyText(formatValue(activeFormat, activeR, activeG, activeB)).then(setCopiedStatus)
        })
        shadesEl.append(sw)
      }
    }
    renderShades()
    sh.querySelector('[data-action="palette"]')?.addEventListener('click', () => {
      chrome.runtime
        .sendMessage({ type: 'COLOR_OPEN_PALETTE', hex: toHex(activeR, activeG, activeB) })
        .catch(() => undefined)
    })
    refreshValueDisplay()
    statusEl.textContent = copied ? options.text.copied : options.text.copyFailed
    statusEl.classList.toggle('fail', !copied)
    const dismiss = () => {
      window.removeEventListener('keydown', onKey, true)
      el.remove()
    }
    el.__dispose = dismiss
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismiss()
      }
    }
    sh.querySelector('.close')?.addEventListener('click', dismiss)
    window.addEventListener('keydown', onKey, true)
    document.documentElement.append(el)
    if (!reduced) {
      card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 })
    }
  }

  return new EyeDropperCtor()
    .open()
    .then(async (result) => {
      const rgb = parseHex(result.sRGBHex)
      if (!rgb) return { ok: false, error: 'hex' }
      const hex = toHex(rgb.r, rgb.g, rgb.b)
      const format = options.format
      const value = formatValue(format, rgb.r, rgb.g, rgb.b)
      const copied = await copyText(value)
      showResultPanel(rgb.r, rgb.g, rgb.b, format, copied)
      chrome.runtime
        .sendMessage({ type: 'COLOR_PICKED', hex, format, url: location.href })
        .catch(() => undefined)
      return { ok: true }
    })
    .catch((error: unknown) => ({
      ok: false,
      error: error instanceof Error ? error.message : 'cancel',
    }))
}
