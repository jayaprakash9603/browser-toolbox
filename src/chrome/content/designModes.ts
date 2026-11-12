import { pulseInspectorFrameFocus, registerInspectorFrameBlur } from './inspectorFrameFocus'

const WIREFRAME_STYLE_ID = 'toolbox-wireframe-style'
const FONT_OVERLAY_ID = 'toolbox-font-overlay'

const TOOLBOX_ROOTS = new Set(['html', 'body', 'head', 'svg', 'defs'])
const SKIP_HOVER_TAGS = new Set(['iframe', 'frame', 'object', 'embed', 'video', 'canvas'])

let fontInspectorActive = false
let fontBlurUnregister: (() => void) | null = null
let fontMoveHandler: ((e: PointerEvent) => void) | null = null
let fontLeaveHandler: ((e: PointerEvent) => void) | null = null
let fontOutHandler: ((e: MouseEvent) => void) | null = null

function hoverTarget(event: PointerEvent): Element | null {
  const fromPath = event.composedPath().find((node): node is Element => node instanceof Element)
  if (fromPath) return fromPath
  const target = event.target
  return target instanceof Element ? target : null
}

function isInspectableText(target: Element): boolean {
  if (target.id === FONT_OVERLAY_ID || target.closest(`#${FONT_OVERLAY_ID}`)) return false
  const tag = target.tagName.toLowerCase()
  if (TOOLBOX_ROOTS.has(tag) || SKIP_HOVER_TAGS.has(tag)) return false
  return true
}

function detachFontInspector(): void {
  fontBlurUnregister?.()
  fontBlurUnregister = null
  document.getElementById(FONT_OVERLAY_ID)?.remove()
  if (fontMoveHandler) {
    document.removeEventListener('pointermove', fontMoveHandler, true)
    fontMoveHandler = null
  }
  if (fontLeaveHandler) {
    document.documentElement.removeEventListener('pointerleave', fontLeaveHandler, true)
    fontLeaveHandler = null
  }
  if (fontOutHandler) {
    document.removeEventListener('mouseout', fontOutHandler, true)
    fontOutHandler = null
  }
  window.removeEventListener('blur', onFontInspectorBlur)
}

function onFontInspectorBlur(): void {
  document.getElementById(FONT_OVERLAY_ID)?.style.setProperty('display', 'none')
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

function renderFontTip(tip: HTMLDivElement, cs: CSSStyleDeclaration): void {
  tip.replaceChildren()
  const rows: [string, string][] = [
    ['Family', cs.fontFamily],
    ['Size', cs.fontSize],
    ['Weight', cs.fontWeight],
    ['Line', cs.lineHeight],
  ]
  for (const [label, value] of rows) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;min-width:0'
    const key = document.createElement('span')
    key.textContent = label
    key.style.cssText =
      'flex:0 0 3.25rem;font-size:9px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.72'
    const val = document.createElement('span')
    val.textContent = value
    val.style.cssText = 'flex:1;min-width:0;word-break:break-word;overflow-wrap:anywhere'
    row.append(key, val)
    tip.append(row)
  }
}

function placeFontTip(tip: HTMLDivElement, clientX: number, clientY: number): void {
  const pad = 8
  const gap = 14
  tip.style.display = 'block'
  tip.style.visibility = 'hidden'
  tip.style.left = '0'
  tip.style.top = '0'
  const width = tip.offsetWidth
  const height = tip.offsetHeight
  const maxLeft = Math.max(pad, window.innerWidth - width - pad)
  const maxTop = Math.max(pad, window.innerHeight - height - pad)
  let left = clientX + gap
  let top = clientY + gap
  if (left > maxLeft) left = clientX - width - gap
  if (top > maxTop) top = clientY - height - gap
  left = Math.min(Math.max(left, pad), maxLeft)
  top = Math.min(Math.max(top, pad), maxTop)
  tip.style.left = `${left}px`
  tip.style.top = `${top}px`
  tip.style.visibility = 'visible'
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
  tip.style.cssText = [
    'position:fixed',
    'z-index:2147483646',
    'pointer-events:none',
    'box-sizing:border-box',
    'display:none',
    'max-width:min(360px,calc(100vw - 16px))',
    'padding:8px 10px',
    'border-radius:8px',
    'border:1px solid rgba(255,255,255,.14)',
    'background:rgba(12,12,14,.92)',
    'color:#f8fafc',
    'font:11px/1.45 system-ui,-apple-system,Segoe UI,sans-serif',
    'box-shadow:0 8px 28px rgba(0,0,0,.35)',
  ].join(';')

  mount.appendChild(tip)

  const hideTip = () => {
    tip.style.display = 'none'
    tip.style.visibility = 'hidden'
    tip.replaceChildren()
  }

  fontBlurUnregister = registerInspectorFrameBlur(hideTip)
  pulseInspectorFrameFocus()

  fontMoveHandler = (event: PointerEvent) => {
    pulseInspectorFrameFocus()
    const target = hoverTarget(event)
    if (!target || !isInspectableText(target)) {
      hideTip()
      return
    }
    const cs = getComputedStyle(target)
    renderFontTip(tip, cs)
    placeFontTip(tip, event.clientX, event.clientY)
  }

  fontLeaveHandler = () => hideTip()

  fontOutHandler = (event: MouseEvent) => {
    const related = event.relatedTarget
    if (related instanceof Node && document.contains(related)) return
    hideTip()
  }

  document.addEventListener('pointermove', fontMoveHandler, true)
  document.documentElement.addEventListener('pointerleave', fontLeaveHandler, true)
  document.addEventListener('mouseout', fontOutHandler, true)
  window.addEventListener('blur', onFontInspectorBlur)
}
