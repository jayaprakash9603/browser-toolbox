const WIREFRAME_STYLE_ID = 'toolbox-wireframe-style'
const FONT_OVERLAY_ID = 'toolbox-font-overlay'

let fontInspectorActive = false
let fontMoveHandler: ((e: PointerEvent) => void) | null = null
let fontLeaveHandler: ((e: MouseEvent) => void) | null = null

function hoverTarget(event: PointerEvent): Element | null {
  const fromPath = event.composedPath().find((node): node is Element => node instanceof Element)
  if (fromPath) return fromPath
  const target = event.target
  return target instanceof Element ? target : null
}

function detachFontInspector(): void {
  document.getElementById(FONT_OVERLAY_ID)?.remove()
  if (fontMoveHandler) {
    document.removeEventListener('pointermove', fontMoveHandler, true)
    fontMoveHandler = null
  }
  if (fontLeaveHandler) {
    document.removeEventListener('mouseout', fontLeaveHandler, true)
    fontLeaveHandler = null
  }
}

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

export function isFontInspectorActive(): boolean {
  return fontInspectorActive
}

export function setFontInspector(enabled: boolean): void {
  if (!enabled) {
    if (!fontInspectorActive) return
    fontInspectorActive = false
    void chrome.runtime.sendMessage({ type: 'FONT_INSPECTOR_TAB_STATE', enabled: false }).catch(() => {})
    detachFontInspector()
    return
  }
  if (fontInspectorActive) return
  fontInspectorActive = true
  void chrome.runtime.sendMessage({ type: 'FONT_INSPECTOR_TAB_STATE', enabled: true }).catch(() => {})

  const mount = document.body ?? document.documentElement
  if (!mount) return

  const tip = document.createElement('div')
  tip.id = FONT_OVERLAY_ID
  tip.style.cssText =
    'position:fixed;z-index:2147483646;pointer-events:none;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.82);color:#fff;font:12px/1.35 system-ui,sans-serif;max-width:320px;display:none;white-space:nowrap;'
  mount.appendChild(tip)

  const hideTip = () => {
    tip.style.display = 'none'
  }

  fontMoveHandler = (event: PointerEvent) => {
    const target = hoverTarget(event)
    if (!target || target === tip || tip.contains(target)) {
      hideTip()
      return
    }
    const cs = getComputedStyle(target)
    tip.textContent = `${cs.fontFamily} · ${cs.fontSize} · ${cs.fontWeight} · ${cs.lineHeight}`
    tip.style.display = 'block'
    tip.style.left = `${Math.min(Math.max(event.clientX + 12, 8), window.innerWidth - tip.offsetWidth - 8)}px`
    tip.style.top = `${Math.min(Math.max(event.clientY + 12, 8), window.innerHeight - 40)}px`
  }

  fontLeaveHandler = (event: MouseEvent) => {
    if (event.relatedTarget != null) return
    hideTip()
  }

  document.addEventListener('pointermove', fontMoveHandler, true)
  document.addEventListener('mouseout', fontLeaveHandler, true)
}
