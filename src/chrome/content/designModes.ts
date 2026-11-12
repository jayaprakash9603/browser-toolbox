import { pulseInspectorFrameFocus } from './inspectorFrameFocus'

const WIREFRAME_STYLE_ID = 'toolbox-wireframe-style'
const FONT_OVERLAY_ID = 'toolbox-font-overlay'

const TOOLBOX_ROOTS = new Set(['html', 'body', 'head', 'svg', 'defs'])
const SKIP_HOVER_TAGS = new Set(['iframe', 'frame', 'object', 'embed', 'video', 'canvas'])
const TIP_BRIDGE_SHOW = '__tbx_font_tip_show'
const TIP_BRIDGE_HIDE = '__tbx_font_tip_hide'

let tipBridgeHandler: ((event: MessageEvent) => void) | null = null

export type FontInspectorTipPayload = {
  clientX: number
  clientY: number
  fontFamily: string
  fontSize: string
  fontWeight: string
  lineHeight: string
}

let fontInspectorActive = false
let tipShowGeneration = 0
let fontMoveHandler: ((e: PointerEvent) => void) | null = null
let fontLeaveHandler: ((e: PointerEvent) => void) | null = null
let fontOutHandler: ((e: MouseEvent) => void) | null = null
let topTip: HTMLDivElement | null = null
let lastHoverKey = ''
let lastHoverMs = 0
let pendingHideToken = 0

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

function toTopViewport(clientX: number, clientY: number): { x: number; y: number } {
  let x = clientX
  let y = clientY
  let view: Window = window
  while (view !== view.top) {
    const frame = view.frameElement
    if (!(frame instanceof HTMLElement)) break
    const rect = frame.getBoundingClientRect()
    x += rect.left
    y += rect.top
    view = view.parent
  }
  return { x, y }
}

function hoverKey(target: Element): string {
  const rect = target.getBoundingClientRect()
  return `${target.tagName}:${Math.round(rect.left)}:${Math.round(rect.top)}`
}

function ensureTopTip(): HTMLDivElement | null {
  if (window !== window.top) return null
  if (topTip?.isConnected) return topTip
  const existing = document.getElementById(FONT_OVERLAY_ID)
  if (existing instanceof HTMLDivElement) {
    topTip = existing
    return topTip
  }
  const mount = document.body ?? document.documentElement
  if (!mount) return null
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
    'isolation:isolate',
  ].join(';')
  tip.style.setProperty('color', '#f8fafc', 'important')
  mount.appendChild(tip)
  topTip = tip
  return tip
}

export function hideFontTip(): void {
  tipShowGeneration += 1
  const tip = topTip ?? (document.getElementById(FONT_OVERLAY_ID) as HTMLDivElement | null)
  if (!tip) return
  tip.style.display = 'none'
  tip.style.visibility = 'hidden'
  tip.replaceChildren()
}

const TIP_TEXT_COLOR = '#f8fafc'

function renderFontTip(tip: HTMLDivElement, payload: FontInspectorTipPayload): void {
  tip.replaceChildren()
  const rows: [string, string][] = [
    ['Family', payload.fontFamily],
    ['Size', payload.fontSize],
    ['Weight', payload.fontWeight],
    ['Line', payload.lineHeight],
  ]
  for (const [label, value] of rows) {
    if (!value?.trim()) continue
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;min-width:0'
    const key = document.createElement('span')
    key.textContent = label
    key.style.cssText = [
      'flex:0 0 3.25rem',
      'font-size:9px',
      'font-weight:600',
      'letter-spacing:.06em',
      'text-transform:uppercase',
      'opacity:.72',
      `color:${TIP_TEXT_COLOR}`,
      '-webkit-text-fill-color:currentColor',
    ].join(';')
    key.style.setProperty('color', TIP_TEXT_COLOR, 'important')
    const val = document.createElement('span')
    val.textContent = value
    val.style.cssText = [
      'flex:1',
      'min-width:0',
      'word-break:break-word',
      'overflow-wrap:anywhere',
      `color:${TIP_TEXT_COLOR}`,
      '-webkit-text-fill-color:currentColor',
    ].join(';')
    val.style.setProperty('color', TIP_TEXT_COLOR, 'important')
    row.append(key, val)
    tip.append(row)
  }
}

function placeFontTip(tip: HTMLDivElement, clientX: number, clientY: number, generation: number): void {
  if (!tip.childElementCount || generation !== tipShowGeneration) {
    if (generation === tipShowGeneration) hideFontTip()
    return
  }
  const pad = 8
  const gap = 14
  tip.style.display = 'block'
  tip.style.visibility = 'hidden'
  tip.style.left = '0'
  tip.style.top = '0'
  const width = tip.offsetWidth
  const height = tip.offsetHeight
  if (!tip.childElementCount || generation !== tipShowGeneration) {
    hideFontTip()
    return
  }
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
  if (!tip.childElementCount || generation !== tipShowGeneration) {
    hideFontTip()
    return
  }
  tip.style.visibility = 'visible'
}

export function applyFontTipShow(payload: FontInspectorTipPayload): void {
  if (window !== window.top) return
  const tip = ensureTopTip()
  if (!tip) return
  const generation = tipShowGeneration + 1
  tipShowGeneration = generation
  renderFontTip(tip, payload)
  placeFontTip(tip, payload.clientX, payload.clientY, generation)
}

function postTipShowToTop(payload: FontInspectorTipPayload): void {
  if (window.top && window.top !== window) {
    try {
      window.top.postMessage({ type: TIP_BRIDGE_SHOW, payload }, '*')
      return
    } catch {
      /* cross-origin chain */
    }
  }
  void chrome.runtime.sendMessage({ type: 'FONT_INSPECTOR_SHOW', ...payload }).catch(() => undefined)
}

function postTipHideToTop(): void {
  if (window.top && window.top !== window) {
    try {
      window.top.postMessage({ type: TIP_BRIDGE_HIDE }, '*')
      return
    } catch {
      /* cross-origin chain */
    }
  }
  void chrome.runtime.sendMessage({ type: 'FONT_INSPECTOR_HIDE' }).catch(() => undefined)
}

function flushFontTipHide(): void {
  lastHoverKey = ''
  if (window === window.top) {
    hideFontTip()
    return
  }
  postTipHideToTop()
}

function requestFontTipHide(): void {
  const token = ++pendingHideToken
  requestAnimationFrame(() => {
    if (token !== pendingHideToken) return
    flushFontTipHide()
  })
}

function requestFontTipShow(payload: FontInspectorTipPayload): void {
  pendingHideToken += 1
  if (window === window.top) {
    applyFontTipShow(payload)
    return
  }
  postTipShowToTop(payload)
}

function bindTipBridge(): void {
  if (window !== window.top || tipBridgeHandler) return
  tipBridgeHandler = (event: MessageEvent) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === TIP_BRIDGE_SHOW && data.payload) {
      applyFontTipShow(data.payload as FontInspectorTipPayload)
    } else if (data.type === TIP_BRIDGE_HIDE) {
      pendingHideToken += 1
      hideFontTip()
    }
  }
  window.addEventListener('message', tipBridgeHandler)
}

function unbindTipBridge(): void {
  if (tipBridgeHandler) {
    window.removeEventListener('message', tipBridgeHandler)
    tipBridgeHandler = null
  }
}

function publishFontHover(event: PointerEvent): void {
  const target = hoverTarget(event)
  if (!target || !isInspectableText(target)) {
    if (lastHoverKey) requestFontTipHide()
    return
  }
  const key = hoverKey(target)
  const now = performance.now()
  if (key === lastHoverKey && now - lastHoverMs < 32) return
  lastHoverKey = key
  lastHoverMs = now

  const cs = getComputedStyle(target)
  const { x, y } = toTopViewport(event.clientX, event.clientY)
  requestFontTipShow({
    clientX: x,
    clientY: y,
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    lineHeight: cs.lineHeight,
  })
}

function detachFontInspector(): void {
  lastHoverKey = ''
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
  unbindTipBridge()
  pendingHideToken += 1
  flushFontTipHide()
  topTip?.remove()
  topTip = null
  document.getElementById(FONT_OVERLAY_ID)?.remove()
}

function onFontInspectorBlur(): void {
  hideFontTip()
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
  document.getElementById(FONT_OVERLAY_ID)?.remove()
  if (window !== window.top) topTip = null
  void chrome.runtime.sendMessage({ type: 'FONT_INSPECTOR_TAB_STATE', enabled: true }).catch(() => {})

  const hideOnPointerLeave = () => requestFontTipHide()

  if (window === window.top) {
    ensureTopTip()
    bindTipBridge()
  }

  pulseInspectorFrameFocus()

  fontMoveHandler = (event: PointerEvent) => {
    pulseInspectorFrameFocus()
    publishFontHover(event)
  }

  fontLeaveHandler = hideOnPointerLeave

  fontOutHandler = (event: MouseEvent) => {
    const related = event.relatedTarget
    if (related instanceof Node && document.contains(related)) return
    requestFontTipHide()
  }

  document.addEventListener('pointermove', fontMoveHandler, true)
  document.documentElement.addEventListener('pointerleave', fontLeaveHandler, true)
  document.addEventListener('mouseout', fontOutHandler, true)
  if (window === window.top) window.addEventListener('blur', onFontInspectorBlur)
}
