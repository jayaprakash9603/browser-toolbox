const WIREFRAME_STYLE_ID = 'toolbox-wireframe-style'
const FONT_OVERLAY_ID = 'toolbox-font-overlay'

let fontInspectorActive = false
let fontMoveHandler: ((e: MouseEvent) => void) | null = null

export function setWireframe(enabled: boolean): void {
  const existing = document.getElementById(WIREFRAME_STYLE_ID)
  if (!enabled) {
    existing?.remove()
    return
  }
  if (existing) return
  const style = document.createElement('style')
  style.id = WIREFRAME_STYLE_ID
  style.textContent = `
    * { outline: 1px solid rgba(255, 0, 0, 0.25) !important; }
    *:hover { outline: 1px solid rgba(0, 128, 255, 0.55) !important; }
  `
  document.head.appendChild(style)
}

export function setFontInspector(enabled: boolean): void {
  if (enabled === fontInspectorActive) return
  fontInspectorActive = enabled
  const overlay = document.getElementById(FONT_OVERLAY_ID) as HTMLDivElement | null
  if (!enabled) {
    overlay?.remove()
    if (fontMoveHandler) {
      document.removeEventListener('mousemove', fontMoveHandler, true)
      fontMoveHandler = null
    }
    return
  }
  const tip =
    document.getElementById(FONT_OVERLAY_ID) ??
    (() => {
      const el = document.createElement('div')
      el.id = FONT_OVERLAY_ID
      el.style.cssText =
        'position:fixed;z-index:2147483646;pointer-events:none;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.82);color:#fff;font:12px/1.35 system-ui,sans-serif;max-width:320px;display:none;'
      document.body.appendChild(el)
      return el
    })()

  fontMoveHandler = (e: MouseEvent) => {
    const target = e.target as Element | null
    if (!target || target === tip) return
    const cs = getComputedStyle(target)
    tip.style.display = 'block'
    tip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 280)}px`
    tip.style.top = `${Math.min(e.clientY + 12, window.innerHeight - 80)}px`
    tip.textContent = `${cs.fontFamily} · ${cs.fontSize} · ${cs.fontWeight} · ${cs.lineHeight}`
  }
  document.addEventListener('mousemove', fontMoveHandler, true)
}

export function collectReadableText(): string {
  const article = document.querySelector('article')
  const root = article ?? document.body
  return (root.textContent ?? '').replace(/\s+/g, ' ').trim()
}
