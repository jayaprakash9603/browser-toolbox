import {
  SCRAPER_PICK_KEY,
  cssPathFromRoot,
  generalizeRowSelector,
  relativeSelector,
  type ScraperPickMode,
  type ScraperPickResult,
} from '@/core/scraper'

const OVERLAY_ID = 'toolbox-scraper-picker-overlay'
const LABEL_ID = 'toolbox-scraper-picker-label'

let active = false
let mode: ScraperPickMode = 'row'
let rowSelectorContext: string | undefined
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
    border: '2px solid #f59e0b',
    background: 'rgba(245, 158, 11, 0.15)',
    borderRadius: '2px',
    display: 'none',
  })
  label = document.createElement('div')
  label.id = LABEL_ID
  Object.assign(label.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    background: '#78350f',
    color: '#fff',
    font: '11px/1.4 monospace',
    padding: '2px 6px',
    borderRadius: '3px',
    display: 'none',
  })
  document.documentElement.append(overlay, label)
}

function teardown(): void {
  if (!active) return
  active = false
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onKeyDown, true)
  document.body.style.cursor = ''
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
  label.textContent = `${mode}: ${element.tagName.toLowerCase()}`
  Object.assign(label.style, {
    display: 'block',
    top: `${Math.max(0, rect.top - 22)}px`,
    left: `${Math.max(0, rect.left)}px`,
  })
}

function onMouseMove(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.id === OVERLAY_ID || target.id === LABEL_ID) return
  highlight(target)
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    teardown()
  }
}

async function persist(result: ScraperPickResult): Promise<void> {
  const area = chrome.storage.session ?? chrome.storage.local
  try {
    await area.set({ [SCRAPER_PICK_KEY]: result })
  } catch {
    /* */
  }
}

function onClick(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
  const target = hovered
  if (!target) {
    teardown()
    return
  }
  let result: ScraperPickResult
  if (mode === 'row') {
    const { rowSelector, count } = generalizeRowSelector(target)
    result = {
      mode,
      selector: rowSelector,
      rowSelector,
      matchCount: count,
      at: Date.now(),
    }
  } else if (mode === 'column') {
    const row = rowSelectorContext
      ? document.querySelector(rowSelectorContext)
      : target.parentElement
    const rel = row instanceof Element ? relativeSelector(row, target) : cssPathFromRoot(target)
    result = {
      mode,
      selector: rel,
      rowSelector: rowSelectorContext,
      at: Date.now(),
    }
  } else {
    result = {
      mode: 'next',
      selector: cssPathFromRoot(target),
      at: Date.now(),
    }
  }
  teardown()
  void persist(result)
}

export function startScraperPick(pickMode: ScraperPickMode, contextRowSelector?: string): void {
  teardown()
  mode = pickMode
  rowSelectorContext = contextRowSelector
  active = true
  ensureOverlay()
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)
  document.body.style.cursor = 'crosshair'
}

export function cancelScraperPick(): void {
  teardown()
}

export function isScraperPickActive(): boolean {
  return active
}
