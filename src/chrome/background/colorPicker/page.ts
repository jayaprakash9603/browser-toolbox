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
  const TOAST_ID = 'tbx-color-toast-host'
  const FORMATS = ['hex', 'rgb', 'hsl'] as const
  const ZOOMS = [5, 7, 9, 11, 15, 21]
  const LOUPE = 132
  const TOAST_MS = 2600
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

  function formatValue(format: (typeof FORMATS)[number], r: number, g: number, b: number): string {
    if (format === 'rgb') return `rgb(${r}, ${g}, ${b})`
    if (format === 'hsl') return toHsl(r, g, b)
    return toHex(r, g, b)
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

    // ── Toast ────────────────────────────────────────────────────────────────
    let toastHost: Host | null = null
    let toastTimer = 0
    let toastRemaining = TOAST_MS
    let toastStarted = 0
    let toastBar: Animation | null = null

    function dismissToast(): void {
      window.clearTimeout(toastTimer)
      const target = toastHost
      if (!target) return
      toastHost = null
      const pill = target.shadowRoot?.querySelector('.toast') as HTMLElement | null
      const done = () => target.remove()
      if (!pill || reduced) {
        pill?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished.then(done, done)
        if (!pill) done()
        return
      }
      pill
        .animate(
          [
            { opacity: 1, transform: 'translateY(0) scale(1)' },
            { opacity: 0, transform: 'translateY(-10px) scale(.96)' },
          ],
          { duration: 160, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
        )
        .finished.then(done, done)
    }

    function armToast(ms: number): void {
      window.clearTimeout(toastTimer)
      toastRemaining = ms
      toastStarted = performance.now()
      toastTimer = window.setTimeout(dismissToast, ms)
    }

    function showToast(copied: boolean, value: string, formatName: string): void {
      const hex = toHex(current.r, current.g, current.b)
      const light = (current.r * 299 + current.g * 587 + current.b * 114) / 1000 > 150
      if (!toastHost) {
        const stale = document.getElementById(TOAST_ID) as Host | null
        stale?.__dispose?.()
        stale?.remove()

        const el = document.createElement('div') as Host
        el.id = TOAST_ID
        el.style.cssText =
          'position:fixed;left:0;right:0;top:10px;z-index:2147483647;display:flex;justify-content:center;pointer-events:none;'
        const sh = el.attachShadow({ mode: 'open' })
        sh.innerHTML = `
          <style>
            :host { all: initial; }
            * { box-sizing: border-box; }
            .toast { position:relative; display:flex; align-items:center; gap:9px; height:38px;
              padding:0 8px 0 7px; border-radius:999px; overflow:hidden; pointer-events:auto; cursor:default;
              font:500 12px/1 system-ui,-apple-system,'Segoe UI',sans-serif;
              color:#f4f4f5; background:rgba(26,26,30,.9); border:1px solid rgba(255,255,255,.12);
              box-shadow:0 10px 30px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2);
              -webkit-backdrop-filter:blur(16px) saturate(170%); backdrop-filter:blur(16px) saturate(170%); }
            .sw { width:22px; height:22px; border-radius:50%; flex:none; background:var(--c);
              box-shadow:inset 0 0 0 1px rgba(255,255,255,.28), 0 0 0 2px rgba(255,255,255,.08); }
            .val { font:600 13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing:.01em; }
            .tag { display:inline-flex; align-items:center; gap:4px; padding:4px 8px 4px 6px; border-radius:999px;
              font-size:10.5px; font-weight:600; color:#86efac; background:rgba(34,197,94,.16); }
            .tag.fail { color:#fca5a5; background:rgba(239,68,68,.16); }
            .tag svg { width:12px; height:12px; }
            .tag path { stroke-dasharray:20; stroke-dashoffset:0; }
            .fmt { opacity:.55; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
            .bar { position:absolute; left:0; right:0; bottom:0; height:2px; background:var(--c);
              transform-origin:left center; opacity:.9; }
            @media (prefers-color-scheme: light) {
              .toast { color:#18181b; background:rgba(255,255,255,.92); border-color:rgba(0,0,0,.08);
                box-shadow:0 10px 30px rgba(0,0,0,.16), 0 2px 6px rgba(0,0,0,.08); }
              .sw { box-shadow:inset 0 0 0 1px rgba(0,0,0,.14), 0 0 0 2px rgba(0,0,0,.04); }
              .tag { color:#15803d; background:rgba(34,197,94,.14); }
              .tag.fail { color:#b91c1c; background:rgba(239,68,68,.12); }
            }
          </style>
          <div class="toast" role="status" aria-live="polite">
            <span class="sw"></span>
            <span class="val"></span>
            <span class="fmt"></span>
            <span class="tag">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>
              <span class="msg"></span>
            </span>
            <span class="bar"></span>
          </div>`
        el.__dispose = () => window.clearTimeout(toastTimer)
        const pill = sh.querySelector('.toast') as HTMLElement
        pill.addEventListener('pointerenter', () => {
          window.clearTimeout(toastTimer)
          toastRemaining = Math.max(900, toastRemaining - (performance.now() - toastStarted))
          toastBar?.pause()
        })
        pill.addEventListener('pointerleave', () => {
          armToast(toastRemaining)
          toastBar?.play()
        })
        pill.addEventListener('click', dismissToast)
        document.documentElement.append(el)
        toastHost = el
        if (!reduced) {
          pill.animate(
            [
              { opacity: 0, transform: 'translateY(-16px) scale(.92)' },
              { opacity: 1, transform: 'translateY(0) scale(1)' },
            ],
            { duration: 280, easing: 'cubic-bezier(.2,.9,.25,1.12)' },
          )
        } else {
          pill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
        }
      }

      const sh = (toastHost as Host).shadowRoot as ShadowRoot
      const pill = sh.querySelector('.toast') as HTMLElement
      const tag = sh.querySelector('.tag') as HTMLElement
      pill.style.setProperty('--c', hex)
      ;(sh.querySelector('.val') as HTMLElement).textContent = value
      ;(sh.querySelector('.fmt') as HTMLElement).textContent = formatName
      ;(sh.querySelector('.msg') as HTMLElement).textContent = copied ? options.text.copied : options.text.copyFailed
      tag.classList.toggle('fail', !copied)
      ;(sh.querySelector('.bar') as HTMLElement).style.opacity = light ? '0.55' : '0.9'
      if (!reduced) {
        ;(sh.querySelector('.sw') as HTMLElement).animate(
          [{ transform: 'scale(.6)' }, { transform: 'scale(1)' }],
          { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1.4)' },
        )
        ;(sh.querySelector('.tag path') as SVGPathElement | null)?.animate(
          [{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }],
          { duration: 320, delay: 60, easing: 'ease-out', fill: 'backwards' },
        )
      }
      toastBar?.cancel()
      toastBar = (sh.querySelector('.bar') as HTMLElement).animate(
        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: TOAST_MS, easing: 'linear', fill: 'forwards' },
      )
      armToast(TOAST_MS)
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
      void copying.then((ok) => showToast(ok, value, format))
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
