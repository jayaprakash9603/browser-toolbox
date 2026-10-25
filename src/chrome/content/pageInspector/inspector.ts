import { cssEscape, describeElement, generateSelectors } from '@/core/engines/selector'

import {
  COLOR_PROPS,
  DEFAULT_INSPECTOR_LABELS,
  DEFAULT_INSPECTOR_OPTIONS,
  STYLE_GROUPS,
  changesToCss,
  diffInline,
  elementCss,
  elementLabel,
  measureGaps,
  outlineCss,
  parseDeclarations,
  parseTranslate,
  relevantProps,
  serializeDeclarations,
  tidyValue,
  toHex,
  type ChangeRule,
  type InspectorAction,
  type InspectorLabels,
  type PageInspectorOptions,
  type PageInspectorState,
} from './model'
import { OVERLAY_CSS, icon, type IconName } from './ui'

const HOST_ID = 'tbx-page-inspector'
const OUTLINE_ID = 'tbx-page-inspector-outlines'

type Styled = HTMLElement | SVGElement
type Dir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
type Tab = 'styles' | 'code' | 'box'

const DIRS: Dir[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
const CURSORS: Record<Dir, string> = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' }
const BLOCKED = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick'] as const

interface Original {
  selector: string
  style: string | null
  html?: string
  removed?: { parent: Node; next: Node | null }
  added?: boolean
}

interface Snapshot {
  el: Styled
  style: string | null
  html?: string
}

interface Drag {
  move: (event: PointerEvent) => void
  up: () => void
}

interface Ui {
  host: HTMLDivElement
  hover: HTMLDivElement
  margin: HTMLDivElement
  padding: HTMLDivElement
  content: HTMLDivElement
  sel: HTMLDivElement
  chip: HTMLDivElement
  handles: Record<Dir, HTMLDivElement>
  guides: HTMLDivElement
  tip: HTMLDivElement
  panel: HTMLDivElement
  toast: HTMLDivElement
}

let options: PageInspectorOptions = { ...DEFAULT_INSPECTOR_OPTIONS }
let labels: InspectorLabels = DEFAULT_INSPECTOR_LABELS
let ui: Ui | null = null
let hovered: Styled | null = null
let selected: Styled | null = null
let editing: { el: HTMLElement; snap: Snapshot; attr: string | null } | null = null
let drag: Drag | null = null
let suppressClick = false
let frame = 0
let tipFor: Element | null = null
let tab: Tab = 'styles'
let minimized = false
let panelPos: { x: number; y: number } | null = null
let notifyTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined
const originals = new Map<Element, Original>()
const history: (() => void)[] = []

const isStyled = (node: unknown): node is Styled => node instanceof HTMLElement || node instanceof SVGElement
const px = (value: string) => Number.parseFloat(value) || 0
const round = (n: number) => Math.round(n)

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, parent?: Node): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  parent?.appendChild(node)
  return node
}

function iconButton(name: IconName, label: string, onClick: () => void, extra = ''): HTMLButtonElement {
  const button = make('button', `ib ${extra}`.trim())
  button.type = 'button'
  button.title = label
  button.setAttribute('aria-label', label)
  button.append(icon(name))
  button.addEventListener('click', onClick)
  return button
}

function labelOf(el: Element): string {
  return elementLabel(el.tagName.toLowerCase(), el.id, [...el.classList].filter((c) => c && !c.includes(':')))
}

function matchesOnly(selector: string, el: Element): boolean {
  try {
    const found = document.querySelectorAll(selector)
    return found.length === 1 && found[0] === el
  } catch {
    return false
  }
}

/** A selector that matches exactly this element, preferring short readable ones. */
function selectorFor(el: Element): string {
  try {
    const set = generateSelectors(describeElement(el, getComputedStyle(el)))
    for (const candidate of [set.cssId, set.cssClass, set.cssAttribute, set.cssRelative]) {
      if (candidate && matchesOnly(candidate, el)) return candidate
    }
  } catch {
    /* fall back to a structural path */
  }
  const parts: string[] = []
  for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
    if (node.id && matchesOnly(`#${cssEscape(node.id)}`, node)) {
      parts.unshift(`#${cssEscape(node.id)}`)
      break
    }
    const cls = [...node.classList].find((c) => /^-?[_a-zA-Z][\w-]*$/.test(c))
    let segment = cls ? `${node.tagName.toLowerCase()}.${cls}` : node.tagName.toLowerCase()
    const siblings = node.parentElement ? [...node.parentElement.children] : []
    if (siblings.filter((sibling) => sibling.matches(segment)).length > 1) segment += `:nth-child(${siblings.indexOf(node) + 1})`
    parts.unshift(segment)
    if (matchesOnly(parts.join(' > '), el)) break
  }
  return parts.join(' > ')
}

// ---------------------------------------------------------------------------
// History

function remember(el: Styled, withHtml = false): Original {
  let original = originals.get(el)
  if (!original) {
    original = { selector: selectorFor(el), style: el.getAttribute('style') }
    originals.set(el, original)
  }
  if (withHtml && original.html === undefined) original.html = el.innerHTML
  return original
}

function snapshot(el: Styled, withHtml = false): Snapshot {
  remember(el, withHtml)
  return { el, style: el.getAttribute('style'), html: withHtml ? el.innerHTML : undefined }
}

function setStyleAttr(el: Element, value: string | null) {
  if (value === null) el.removeAttribute('style')
  else el.setAttribute('style', value)
}

function restore(snap: Snapshot) {
  setStyleAttr(snap.el, snap.style)
  if (snap.html !== undefined) snap.el.innerHTML = snap.html
}

function commit(snap: Snapshot) {
  const changed = snap.el.getAttribute('style') !== snap.style || (snap.html !== undefined && snap.el.innerHTML !== snap.html)
  if (!changed) return
  history.push(() => restore(snap))
  afterChange()
}

function afterChange() {
  tipFor = null
  refreshPanelValues()
  schedule()
  notify()
}

function undo() {
  const step = history.pop()
  if (!step) return
  step()
  if (selected && !selected.isConnected) select(null)
  else afterChange()
}

function resetAll() {
  if (editing) finishEditing()
  for (const [el, original] of originals) {
    if (original.added) {
      el.remove()
      continue
    }
    if (original.removed) {
      const { parent, next } = original.removed
      parent.insertBefore(el, next && next.parentNode === parent ? next : null)
    }
    setStyleAttr(el, original.style)
    if (original.html !== undefined) el.innerHTML = original.html
  }
  originals.clear()
  history.length = 0
  if (selected && !selected.isConnected) select(null)
  else afterChange()
}

function isChanged(el: Element, original: Original): boolean {
  if (original.added || original.removed) return true
  if ((el.getAttribute('style') ?? '') !== (original.style ?? '')) return diffInline(original.style ?? '', el.getAttribute('style') ?? '').length > 0
  return original.html !== undefined && el.innerHTML !== original.html
}

export function exportChangesCss(): string {
  const rules: ChangeRule[] = []
  for (const [el, original] of originals) {
    if (original.added || !isChanged(el, original)) continue
    if (original.removed) {
      rules.push({ selector: original.selector, decls: [['display', 'none']], notes: [labels.noteRemoved] })
      continue
    }
    const notes = original.html !== undefined && el.innerHTML !== original.html ? [labels.noteText] : []
    rules.push({ selector: original.selector, decls: diffInline(original.style ?? '', el.getAttribute('style') ?? ''), notes })
  }
  return changesToCss(rules)
}

// ---------------------------------------------------------------------------
// Element actions

function setProp(el: Styled, prop: string, value: string) {
  const important = /\s*!important\s*$/i.test(value)
  const clean = value.replace(/\s*!important\s*$/i, '')
  if (clean.trim()) el.style.setProperty(prop, clean, important ? 'important' : '')
  else el.style.removeProperty(prop)
}

function hideSelected() {
  if (!selected) return
  const snap = snapshot(selected)
  selected.style.setProperty('display', 'none', 'important')
  commit(snap)
  select(null)
}

function deleteSelected() {
  if (!selected?.parentNode) return
  const el = selected
  const original = remember(el)
  const parent = el.parentNode as Node
  const next = el.nextSibling
  el.remove()
  original.removed = { parent, next }
  history.push(() => {
    parent.insertBefore(el, next && next.parentNode === parent ? next : null)
    delete original.removed
  })
  select(null)
  notify()
}

function duplicateSelected() {
  if (!selected) return
  const clone = selected.cloneNode(true) as Styled
  selected.after(clone)
  originals.set(clone, { selector: '', style: null, added: true })
  history.push(() => {
    clone.remove()
    originals.delete(clone)
  })
  select(clone)
  notify()
}

function selectParent() {
  const parent = selected?.parentElement
  if (parent && parent !== document.documentElement) select(parent)
}

function selectChild() {
  const child = selected?.firstElementChild
  if (isStyled(child)) select(child)
}

function nudge(dx: number, dy: number) {
  if (!selected) return
  const snap = snapshot(selected)
  const base = parseTranslate(selected.style.translate || getComputedStyle(selected).translate || 'none')
  selected.style.translate = `${round(base.x + dx)}px ${round(base.y + dy)}px`
  commit(snap)
}

function startEditing() {
  if (!options.textEdit || !(selected instanceof HTMLElement)) return
  const el = selected
  editing = { el, snap: snapshot(el, true), attr: el.getAttribute('contenteditable') }
  el.setAttribute('contenteditable', 'plaintext-only')
  if (!el.isContentEditable) el.setAttribute('contenteditable', 'true')
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  el.addEventListener('focusout', finishEditing, { once: true })
  showToast(labels.editing)
}

function finishEditing() {
  const current = editing
  if (!current) return
  editing = null
  current.el.removeEventListener('focusout', finishEditing)
  if (current.attr === null) current.el.removeAttribute('contenteditable')
  else current.el.setAttribute('contenteditable', current.attr)
  current.el.blur()
  commit(current.snap)
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.append(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  showToast(labels.copied, 'check')
}

function showToast(text: string, name?: IconName) {
  if (!ui) return
  ui.toast.replaceChildren(...(name ? [icon(name)] : []), text)
  ui.toast.style.display = 'flex'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => ui && (ui.toast.style.display = 'none'), 1600)
}

// ---------------------------------------------------------------------------
// Drag: move and resize

function beginMove(event: PointerEvent) {
  const el = selected
  if (!el) return
  const start = { x: event.clientX, y: event.clientY }
  const base = parseTranslate(el.style.translate || getComputedStyle(el).translate || 'none')
  const snap = snapshot(el)
  let moved = false
  drag = {
    move(ev) {
      const dx = ev.clientX - start.x
      const dy = ev.clientY - start.y
      if (!moved && Math.hypot(dx, dy) < 4) return
      moved = true
      el.style.translate = `${round(base.x + dx)}px ${round(base.y + dy)}px`
      ui?.sel.classList.add('dragging')
      schedule()
    },
    up() {
      ui?.sel.classList.remove('dragging')
      if (!moved) return
      suppressClick = true
      commit(snap)
    },
  }
}

function beginResize(dir: Dir, event: PointerEvent) {
  const el = selected
  if (!el) return
  event.preventDefault()
  const snap = snapshot(el)
  if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block'
  const cs = getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  const w0 = px(cs.width) || rect.width
  const h0 = px(cs.height) || rect.height
  const base = parseTranslate(el.style.translate || cs.translate || 'none')
  const start = { x: event.clientX, y: event.clientY }
  drag = {
    move(ev) {
      const dx = ev.clientX - start.x
      const dy = ev.clientY - start.y
      let x = base.x
      let y = base.y
      if (dir.includes('e')) el.style.width = `${round(Math.max(4, w0 + dx))}px`
      if (dir.includes('w')) {
        el.style.width = `${round(Math.max(4, w0 - dx))}px`
        x = base.x + Math.min(dx, w0 - 4)
      }
      if (dir.includes('s')) el.style.height = `${round(Math.max(4, h0 + dy))}px`
      if (dir.includes('n')) {
        el.style.height = `${round(Math.max(4, h0 - dy))}px`
        y = base.y + Math.min(dy, h0 - 4)
      }
      if (x !== base.x || y !== base.y) el.style.translate = `${round(x)}px ${round(y)}px`
      schedule()
    },
    up() {
      commit(snap)
    },
  }
}

function beginPanelDrag(event: PointerEvent) {
  if (!ui || (event.target as Element).closest('button')) return
  const rect = ui.panel.getBoundingClientRect()
  const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  drag = {
    move(ev) {
      if (!ui) return
      panelPos = {
        x: Math.min(Math.max(ev.clientX - offset.x, 4), window.innerWidth - rect.width - 4),
        y: Math.min(Math.max(ev.clientY - offset.y, 4), window.innerHeight - 40),
      }
      placePanel()
    },
    up() {},
  }
}

// ---------------------------------------------------------------------------
// Events

function ownEvent(event: Event): boolean {
  return !!ui && event.composedPath().includes(ui.host)
}

function pageTarget(event: Event): Styled | null {
  const target = event.composedPath()[0]
  if (!isStyled(target) || target === document.documentElement) return null
  return target
}

function onPointerMove(event: PointerEvent) {
  if (drag) {
    drag.move(event)
    return
  }
  if (ownEvent(event)) return
  const target = pageTarget(event)
  if (target !== hovered) {
    hovered = target
    schedule()
  }
}

function onPointerUp() {
  if (!drag) return
  const current = drag
  drag = null
  current.up()
}

function onBlocked(event: Event) {
  if (!options.select || ownEvent(event)) return
  const target = pageTarget(event)
  if (editing) {
    if (target && editing.el.contains(target)) return
    if (event.type === 'pointerdown') finishEditing()
  }
  if (event.type === 'pointerup' && drag) return
  event.preventDefault()
  event.stopImmediatePropagation()
  if (!target) return
  if (event.type === 'pointerdown' && (event as PointerEvent).button === 0 && options.move && selected?.contains(target)) beginMove(event as PointerEvent)
  else if (event.type === 'click') {
    if (suppressClick) suppressClick = false
    else select(target)
  } else if (event.type === 'dblclick' && selected?.contains(target)) startEditing()
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.composedPath()[0]
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

function onKeyDown(event: KeyboardEvent) {
  if (editing) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      finishEditing()
    }
    return
  }
  if (isTyping(event)) return
  const handled = (() => {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
      if (!history.length) return false
      undo()
      return true
    }
    if (!selected) return false
    const step = event.shiftKey ? 10 : 1
    switch (event.key) {
      case 'Escape':
        select(null)
        return true
      case 'Delete':
        deleteSelected()
        return true
      case 'Enter':
        startEditing()
        return options.textEdit
      case 'ArrowUp':
        if (event.altKey) selectParent()
        else if (options.move) nudge(0, -step)
        else return false
        return true
      case 'ArrowDown':
        if (event.altKey) selectChild()
        else if (options.move) nudge(0, step)
        else return false
        return true
      case 'ArrowLeft':
        if (!options.move) return false
        nudge(-step, 0)
        return true
      case 'ArrowRight':
        if (!options.move) return false
        nudge(step, 0)
        return true
      default:
        return false
    }
  })()
  if (handled) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}

function onMouseOut(event: MouseEvent) {
  if (!event.relatedTarget && hovered) {
    hovered = null
    schedule()
  }
}

function listen(on: boolean) {
  const method = on ? 'addEventListener' : 'removeEventListener'
  window[method]('pointermove', onPointerMove as EventListener, true)
  window[method]('pointerup', onPointerUp, true)
  window[method]('pointercancel', onPointerUp, true)
  window[method]('keydown', onKeyDown as EventListener, true)
  window[method]('scroll', schedule, true)
  window[method]('resize', schedule)
  document[method]('mouseout', onMouseOut as EventListener)
  for (const type of BLOCKED) window[method](type, onBlocked, true)
}

// ---------------------------------------------------------------------------
// Overlay

function buildUi(): Ui {
  const host = make('div')
  host.id = HOST_ID
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = make('style')
  style.textContent = OVERLAY_CSS
  const root = make('div', 'root')
  shadow.append(style, root)
  const margin = make('div', 'box', root)
  const padding = make('div', 'box padding', root)
  const content = make('div', 'box content', root)
  const hover = make('div', 'hover', root)
  const sel = make('div', 'sel', root)
  const guides = make('div', '', root)
  const chip = make('div', 'chip', root)
  const handles = {} as Record<Dir, HTMLDivElement>
  for (const dir of DIRS) {
    const handle = make('div', 'handle', root)
    handle.style.cursor = CURSORS[dir]
    handle.addEventListener('pointerdown', (event) => beginResize(dir, event))
    handles[dir] = handle
  }
  const tip = make('div', 'tip', root)
  tip.setAttribute('role', 'tooltip')
  const panel = make('div', 'panel', root)
  panel.setAttribute('role', 'dialog')
  panel.addEventListener('keydown', (event) => event.stopPropagation())
  panel.addEventListener('keyup', (event) => event.stopPropagation())
  panel.addEventListener('keypress', (event) => event.stopPropagation())
  const toast = make('div', 'toast', root)
  toast.setAttribute('role', 'status')
  document.documentElement.append(host)
  return { host, hover, margin, padding, content, sel, chip, handles, guides, tip, panel, toast }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(render)
}

function place(node: HTMLElement, left: number, top: number, width: number, height: number) {
  node.style.display = 'block'
  node.style.left = `${left}px`
  node.style.top = `${top}px`
  node.style.width = `${Math.max(0, width)}px`
  node.style.height = `${Math.max(0, height)}px`
}

function sides(cs: CSSStyleDeclaration, prefix: string, suffix = '') {
  return {
    t: Math.max(0, px(cs.getPropertyValue(`${prefix}-top${suffix}`))),
    r: Math.max(0, px(cs.getPropertyValue(`${prefix}-right${suffix}`))),
    b: Math.max(0, px(cs.getPropertyValue(`${prefix}-bottom${suffix}`))),
    l: Math.max(0, px(cs.getPropertyValue(`${prefix}-left${suffix}`))),
  }
}

function render() {
  frame = 0
  if (!ui || !options.enabled) return
  const live = hovered?.isConnected && hovered !== selected && !drag ? hovered : null

  for (const node of [ui.hover, ui.margin, ui.padding, ui.content]) node.style.display = 'none'
  if (live) {
    const rect = live.getBoundingClientRect()
    place(ui.hover, rect.left, rect.top, rect.width, rect.height)
    if (options.boxModel) {
      const cs = getComputedStyle(live)
      const m = sides(cs, 'margin')
      const b = sides(cs, 'border', '-width')
      const p = sides(cs, 'padding')
      place(ui.margin, rect.left - m.l, rect.top - m.t, rect.width + m.l + m.r, rect.height + m.t + m.b)
      ui.margin.style.borderWidth = `${m.t}px ${m.r}px ${m.b}px ${m.l}px`
      place(ui.padding, rect.left + b.l, rect.top + b.t, rect.width - b.l - b.r, rect.height - b.t - b.b)
      ui.padding.style.borderWidth = `${p.t}px ${p.r}px ${p.b}px ${p.l}px`
      place(ui.content, rect.left + b.l + p.l, rect.top + b.t + p.t, rect.width - b.l - b.r - p.l - p.r, rect.height - b.t - b.b - p.t - p.b)
    }
  }
  renderTip(options.hoverInfo ? live : null)

  const sel = selected?.isConnected ? selected : null
  ui.sel.style.display = 'none'
  ui.chip.style.display = 'none'
  for (const dir of DIRS) ui.handles[dir].style.display = 'none'
  if (sel) {
    const rect = sel.getBoundingClientRect()
    place(ui.sel, rect.left, rect.top, rect.width, rect.height)
    ui.chip.textContent = `${labelOf(sel)}  ${round(rect.width)} × ${round(rect.height)}`
    ui.chip.style.display = 'block'
    ui.chip.style.left = `${Math.max(4, rect.left)}px`
    ui.chip.style.top = `${rect.top > 26 ? rect.top - 24 : rect.bottom + 4}px`
    if (options.resize && !editing) {
      const xs = { w: rect.left, c: rect.left + rect.width / 2, e: rect.right }
      const ys = { n: rect.top, c: rect.top + rect.height / 2, s: rect.bottom }
      for (const dir of DIRS) {
        const x = dir.includes('w') ? xs.w : dir.includes('e') ? xs.e : xs.c
        const y = dir.includes('n') ? ys.n : dir.includes('s') ? ys.s : ys.c
        const handle = ui.handles[dir]
        handle.style.display = 'block'
        handle.style.left = `${x}px`
        handle.style.top = `${y}px`
      }
    }
    if (minimized || ui.panel.style.display !== 'none') refreshDims(rect)
  }

  ui.guides.replaceChildren()
  if (options.guides && sel && live) {
    const a = sel.getBoundingClientRect()
    const b = live.getBoundingClientRect()
    for (const guide of measureGaps(a, b)) {
      const line = make('div', 'guide', ui.guides)
      const horizontal = guide.y1 === guide.y2
      place(line, Math.min(guide.x1, guide.x2), Math.min(guide.y1, guide.y2), horizontal ? Math.abs(guide.x2 - guide.x1) : 1, horizontal ? 1 : Math.abs(guide.y2 - guide.y1))
      const tag = make('div', 'guide-label', ui.guides)
      tag.textContent = `${guide.value}`
      tag.style.left = `${(guide.x1 + guide.x2) / 2}px`
      tag.style.top = `${(guide.y1 + guide.y2) / 2}px`
    }
  }

  if (drag || sel || live) schedule()
}

function renderTip(target: Styled | null) {
  if (!ui) return
  const tip = ui.tip
  if (!target) {
    tip.style.display = 'none'
    tipFor = null
    return
  }
  const rect = target.getBoundingClientRect()
  if (tipFor !== target) {
    tipFor = target
    const cs = getComputedStyle(target)
    const head = make('div', 'tip-head')
    const tag = make('span', 'tag', head)
    tag.textContent = labelOf(target)
    const dim = make('span', 'dim', head)
    dim.textContent = `${round(rect.width)} × ${round(rect.height)}`
    const rows = make('div', 'rows')
    const row = (key: string, value: string, swatch?: string) => {
      make('span', 'k', rows).textContent = key
      const v = make('span', 'v', rows)
      if (swatch) make('span', 'sw', v).style.background = swatch
      v.append(value)
    }
    row('display', cs.position !== 'static' ? `${cs.display} · ${cs.position}` : cs.display)
    row('font', `${tidyValue(cs.fontSize)} / ${cs.fontWeight} · ${cs.fontFamily.split(',')[0].replace(/["']/g, '')}`)
    row('color', toHex(cs.color), cs.color)
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') row('background', toHex(cs.backgroundColor), cs.backgroundColor)
    for (const [prop, value] of elementCss((p) => cs.getPropertyValue(p))) {
      if (['margin', 'padding', 'border-radius', 'gap', 'box-shadow', 'opacity'].includes(prop)) row(prop, value)
    }
    tip.replaceChildren(head, rows)
    if (options.select) {
      const hint = make('div', 'hint', tip)
      hint.textContent = labels.hintSelect
    }
  }
  tip.style.display = 'block'
  const width = tip.offsetWidth
  const height = tip.offsetHeight
  let top = rect.bottom + 8
  if (top + height > window.innerHeight - 8) top = rect.top - height - 8
  if (top < 8) top = Math.min(window.innerHeight - height - 8, Math.max(8, rect.top + 8))
  tip.style.top = `${top}px`
  tip.style.left = `${Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)}px`
}

// ---------------------------------------------------------------------------
// Panel

function placePanel() {
  if (!ui) return
  const panel = ui.panel
  if (panelPos) {
    panel.style.left = `${panelPos.x}px`
    panel.style.top = `${panelPos.y}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
  }
}

function refreshDims(rect: DOMRect) {
  const dim = ui?.panel.querySelector('.head .dim')
  if (dim) dim.textContent = `${round(rect.width)} × ${round(rect.height)}`
}

function renderPanel() {
  if (!ui) return
  const panel = ui.panel
  const el = selected
  if (!el || !options.select) {
    panel.style.display = 'none'
    return
  }
  panel.style.display = 'flex'
  panel.classList.toggle('min', minimized)
  panel.setAttribute('aria-label', labelOf(el))
  placePanel()

  const head = make('div', 'head')
  head.addEventListener('pointerdown', beginPanelDrag)
  const tag = make('span', 'tag', head)
  tag.textContent = labelOf(el)
  tag.title = labelOf(el)
  make('span', 'dim', head)
  head.append(
    iconButton(minimized ? 'expand' : 'minimize', minimized ? labels.expand : labels.minimize, () => {
      minimized = !minimized
      renderPanel()
    }),
    iconButton('close', labels.close, () => select(null)),
  )

  const tools = make('div', 'tools')
  const parentButton = iconButton('parent', labels.parent, selectParent)
  parentButton.disabled = !el.parentElement || el.parentElement === document.documentElement
  tools.append(parentButton)
  if (options.textEdit && el instanceof HTMLElement) tools.append(iconButton('text', labels.editText, startEditing))
  tools.append(iconButton('duplicate', labels.duplicate, duplicateSelected), iconButton('hide', labels.hide, hideSelected), iconButton('trash', labels.delete, deleteSelected, 'danger'))
  make('span', 'sep', tools)
  const undoButton = iconButton('undo', labels.undo, undo)
  undoButton.disabled = history.length === 0
  undoButton.dataset.role = 'undo'
  tools.append(undoButton)

  const tabs = make('div', 'tabs')
  tabs.setAttribute('role', 'tablist')
  for (const id of ['styles', 'code', 'box'] as Tab[]) {
    const button = make('button', 'tab', tabs)
    button.type = 'button'
    button.setAttribute('role', 'tab')
    button.setAttribute('aria-selected', String(tab === id))
    button.textContent = labels[id]
    button.addEventListener('click', () => {
      tab = id
      renderPanel()
    })
  }

  const body = make('div', 'body')
  body.setAttribute('role', 'tabpanel')
  if (tab === 'styles') renderStyles(body, el)
  else if (tab === 'code') renderCode(body, el)
  else renderBox(body, el)

  const actions = make('div', 'actions foot')
  const copyButton = (text: string, getText: () => string) => {
    const button = make('button', 'btn', actions)
    button.type = 'button'
    button.append(icon('copy'), text)
    button.addEventListener('click', () => void copyText(getText()))
  }
  copyButton(labels.copyCss, () => `${selectorFor(el)} {\n${serializeDeclarations(elementCss((p) => getComputedStyle(el).getPropertyValue(p)), '  ')}\n}`)
  copyButton(labels.copySelector, () => selectorFor(el))
  copyButton(labels.copyHtml, () => el.outerHTML)

  panel.replaceChildren(head, tools, tabs, body, actions)
  if (tab === 'styles') refreshPanelValues(true)
  refreshDims(el.getBoundingClientRect())
}

function bindEditing(input: HTMLInputElement | HTMLTextAreaElement, el: Styled, apply: (value: string) => void) {
  let snap: Snapshot | null = null
  input.addEventListener('focus', () => {
    snap = snapshot(el)
  })
  input.addEventListener('input', () => {
    apply(input.value)
    schedule()
  })
  const done = () => {
    if (snap) commit(snap)
    snap = null
  }
  input.addEventListener('change', done)
  input.addEventListener('blur', done)
  input.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key
    if (key === 'Enter' && input instanceof HTMLInputElement) input.blur()
    if (key === 'Escape' && snap) {
      restore(snap)
      snap = null
      input.blur()
      refreshPanelValues(true)
    }
  })
}

function renderStyles(body: HTMLElement, el: Styled) {
  const cs = getComputedStyle(el)
  const props = new Set(relevantProps(cs.display, cs.position))
  for (const group of STYLE_GROUPS) {
    const list = (group.props as readonly string[]).filter((prop) => props.has(prop))
    if (!list.length) continue
    make('div', 'group', body).textContent = labels[group.id]
    for (const prop of list) {
      const field = make('div', 'field', body)
      const id = `tbx-f-${prop}`
      const label = make('label', '', field)
      label.htmlFor = id
      label.textContent = prop
      label.title = prop
      const ctl = make('div', 'ctl', field)
      let swatch: HTMLInputElement | null = null
      if (COLOR_PROPS.has(prop)) {
        const wrap = make('label', 'color', ctl)
        wrap.title = prop
        swatch = make('input', '', wrap)
        swatch.type = 'color'
        swatch.dataset.prop = prop
        swatch.setAttribute('aria-label', prop)
      }
      const input = make('input', 'txt', ctl)
      input.id = id
      input.spellcheck = false
      input.dataset.prop = prop
      bindEditing(input, el, (value) => setProp(el, prop, value))
      if (swatch) {
        const color = swatch
        bindEditing(color, el, (value) => {
          setProp(el, prop, value)
          input.value = value
        })
      }
    }
  }
}

function renderCode(body: HTMLElement, el: Styled) {
  const initial = new Map(elementCss((p) => getComputedStyle(el).getPropertyValue(p)))
  const area = make('textarea', '', body)
  area.spellcheck = false
  area.setAttribute('aria-label', labels.code)
  area.value = serializeDeclarations([...initial])
  bindEditing(area, el, (value) => {
    for (const [prop, val] of parseDeclarations(value)) if (initial.get(prop) !== val) setProp(el, prop, val)
  })
  make('p', 'note', body).textContent = labels.codeHint
}

function renderBox(body: HTMLElement, el: Styled) {
  const cs = getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  const layer = (cls: string, title: string, values: Record<'t' | 'r' | 'b' | 'l', number>, parent: HTMLElement) => {
    const box = make('div', cls, parent)
    make('span', 't', box).textContent = title
    for (const [key, pos] of [['t', 'top'], ['r', 'right'], ['b', 'bottom'], ['l', 'left']] as const) {
      const n = make('span', `n ${pos}`, box)
      n.textContent = values[key] ? String(round(values[key])) : '–'
    }
    return box
  }
  const wrap = make('div', 'bm', body)
  const m = layer('m', labels.margin, sides(cs, 'margin'), wrap)
  const b = layer('b', labels.border, sides(cs, 'border', '-width'), m)
  const p = layer('p', labels.padding, sides(cs, 'padding'), b)
  const c = make('div', 'c', p)
  c.textContent = `${round(px(cs.width) || rect.width)} × ${round(px(cs.height) || rect.height)}`
  make('p', 'note', body).textContent = `box-sizing: ${cs.boxSizing}`
}

function refreshPanelValues(force = false) {
  if (!ui || !selected) return
  const panel = ui.panel
  const undoButton = panel.querySelector<HTMLButtonElement>('[data-role="undo"]')
  if (undoButton) undoButton.disabled = history.length === 0
  const cs = getComputedStyle(selected)
  for (const input of panel.querySelectorAll<HTMLInputElement>('input[data-prop]')) {
    if (!force && (input.getRootNode() as ShadowRoot).activeElement === input) continue
    const value = cs.getPropertyValue(input.dataset.prop ?? '')
    if (input.type === 'color') {
      const hex = toHex(value)
      input.value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'
      const wrap = input.parentElement
      if (wrap) wrap.style.background = value
    } else input.value = COLOR_PROPS.has(input.dataset.prop ?? '') ? toHex(value) : tidyValue(value)
  }
  if (tab === 'box' && !force) {
    const body = panel.querySelector<HTMLElement>('.body')
    if (body) {
      body.replaceChildren()
      renderBox(body, selected)
    }
  }
}

function select(target: Styled | null) {
  if (editing) finishEditing()
  selected = target && target !== document.documentElement ? target : null
  tipFor = null
  renderPanel()
  schedule()
  notify()
}

// ---------------------------------------------------------------------------
// Public API

function applyOutlines() {
  const existing = document.getElementById(OUTLINE_ID)
  if (!options.enabled || !options.outlines) {
    existing?.remove()
    return
  }
  const style = existing ?? document.createElement('style')
  style.id = OUTLINE_ID
  style.textContent = outlineCss(options.outlineMode, HOST_ID)
  if (!existing) (document.head ?? document.documentElement).append(style)
}

function teardown() {
  if (editing) finishEditing()
  drag = null
  if (ui) {
    listen(false)
    ui.host.remove()
    ui = null
  }
  if (frame) cancelAnimationFrame(frame)
  frame = 0
  hovered = null
  selected = null
  tipFor = null
}

export function getInspectorState(): PageInspectorState {
  let changes = 0
  for (const [el, original] of originals) if (isChanged(el, original)) changes += 1
  return { options: { ...options }, changes, canUndo: history.length > 0, selected: selected ? labelOf(selected) : null }
}

function notify() {
  clearTimeout(notifyTimer)
  notifyTimer = setTimeout(() => {
    try {
      void chrome.runtime?.sendMessage({ type: 'PAGE_INSPECTOR_STATE', state: getInspectorState() })?.catch(() => {})
    } catch {
      /* extension context gone */
    }
  }, 60)
}

export function setInspector(next: Partial<PageInspectorOptions>, nextLabels?: Partial<InspectorLabels>): PageInspectorState {
  if (nextLabels) labels = { ...DEFAULT_INSPECTOR_LABELS, ...nextLabels }
  options = { ...options, ...next }
  applyOutlines()
  if (!options.enabled) teardown()
  else {
    if (!ui) {
      ui = buildUi()
      listen(true)
    }
    if (!options.select) selected = null
    tipFor = null
    renderPanel()
    schedule()
  }
  notify()
  return getInspectorState()
}

export function runInspectorAction(action: InspectorAction): { state: PageInspectorState; css?: string } {
  if (action === 'undo') undo()
  else if (action === 'reset') resetAll()
  else if (action === 'deselect') select(null)
  return { state: getInspectorState(), css: action === 'export' ? exportChangesCss() : undefined }
}
