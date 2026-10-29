import {
  describeElement,
  generateSelectors,
  type CapturedElement,
  type SelectorSet,
} from '@/core/engines/selector'
import { captureSelectorSnapshot } from '@/core/engines/selector-studio/capture'
import type { SelectorSnapshot } from '@/core/engines/selector-studio/types'

const OVERLAY_ID = 'toolbox-element-picker-overlay'
const LABEL_ID = 'toolbox-element-picker-label'

export interface PickedElementResult {
  element: CapturedElement
  selectors: SelectorSet
  snapshot?: SelectorSnapshot
}

let active = false
let overlay: HTMLDivElement | null = null
let label: HTMLDivElement | null = null
let hovered: Element | null = null

function ensureOverlay(): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  Object.assign(overlay.style, {
    position: 'fixed',
    zIndex: '2147483646',
    pointerEvents: 'none',
    border: '2px solid #6366f1',
    background: 'rgba(99, 102, 241, 0.12)',
    borderRadius: '2px',
    display: 'none',
  })
  label = document.createElement('div')
  label.id = LABEL_ID
  Object.assign(label.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    background: '#312e81',
    color: '#fff',
    font: '11px/1.4 monospace',
    padding: '2px 6px',
    borderRadius: '3px',
    display: 'none',
    maxWidth: '360px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })
  document.documentElement.append(overlay, label)
}

function removeOverlay(): void {
  overlay?.remove()
  label?.remove()
  overlay = null
  label = null
  hovered = null
}

function highlight(element: Element): void {
  if (!overlay || !label) return
  hovered = element
  const rect = element.getBoundingClientRect()
  Object.assign(overlay.style, {
    display: 'block',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''
  const cls = element.classList.length > 0 ? `.${[...element.classList].slice(0, 3).join('.')}` : ''
  label.textContent = `${tag}${id}${cls}`
  Object.assign(label.style, {
    display: 'block',
    top: `${Math.max(0, rect.top - 22)}px`,
    left: `${Math.max(0, rect.left)}px`,
  })
}

function eventElement(event: Event): Element | null {
  for (const node of event.composedPath()) {
    if (!(node instanceof Element)) continue
    if (node.id === OVERLAY_ID || node.id === LABEL_ID) continue
    return node
  }
  return event.target instanceof Element ? event.target : null
}

function onMouseMove(event: MouseEvent): void {
  const target = eventElement(event)
  if (!target) return
  highlight(target)
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    stopPicker()
  }
}

function onClick(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
  const target = eventElement(event) ?? hovered
  if (!target) {
    stopPicker()
    return
  }
  const computed = window.getComputedStyle(target)
  const element = describeElement(target, computed)
  const result: PickedElementResult = {
    element,
    selectors: generateSelectors(element),
    snapshot: captureSelectorSnapshot(target),
  }
  stopPicker()
  void persistResult(result)
}

async function persistResult(result: PickedElementResult): Promise<void> {
  const area = chrome.storage.session ?? chrome.storage.local
  try {
    await area.set({ 'toolbox.pickedElement': result })
  } catch {
    /* storage unavailable */
  }
}

function stopPicker(): void {
  if (!active) return
  active = false
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onKeyDown, true)
  document.body.style.cursor = ''
  removeOverlay()
}

export function startPicker(): void {
  if (active) return
  active = true
  ensureOverlay()
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)
  document.body.style.cursor = 'crosshair'
}

export function cancelPicker(): void {
  stopPicker()
}

export function isPickerActive(): boolean {
  return active
}
