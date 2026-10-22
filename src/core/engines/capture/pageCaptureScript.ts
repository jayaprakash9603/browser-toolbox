import type { AreaSelection, PageCaptureMetrics } from './pageActions'

export interface SelectionLiveSlice {
  dataUrl: string
  scrollX: number
  scrollY: number
  view: { x: number; y: number; width: number; height: number }
}

export interface SelectionCaptureResult extends AreaSelection {
  slices: SelectionLiveSlice[]
  savedScrollX: number
  savedScrollY: number
}

export interface ScrollTargetMetrics extends PageCaptureMetrics {
  scrollTarget: 'window' | 'element'
  elementSelector?: string
}

export interface EntireCaptureTarget extends ScrollTargetMetrics {
  /** Viewport rect (CSS px) of the inner scroller; absent when the document scrolls. */
  clip?: { x: number; y: number; width: number; height: number }
}

// Functions below are injected with chrome.scripting.executeScript, which serializes only the
// function body: they must not reference any other module-level binding.

export function prepareEntireCaptureScrollTarget(): EntireCaptureTarget {
  const store = window as unknown as Record<string, HTMLElement | null>
  const dpr = window.devicePixelRatio || 1
  const root = document.documentElement
  const body = document.body
  const docHeight = Math.max(root.scrollHeight, body?.scrollHeight ?? 0, root.clientHeight)
  const windowMetrics: EntireCaptureTarget = {
    scrollTarget: 'window',
    scrollHeight: docHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollY: window.scrollY,
    devicePixelRatio: dpr,
  }
  store.__tbxCaptureScrollEl = null
  if (docHeight > window.innerHeight + 8) return windowMetrics

  let best: HTMLElement | null = null
  let bestArea = 0
  document.querySelectorAll<HTMLElement>('div, main, section, article').forEach((el) => {
    const overflowY = getComputedStyle(el).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 8) {
      const area = el.clientWidth * el.clientHeight
      if (area > bestArea) {
        bestArea = area
        best = el
      }
    }
  })
  const target = best as HTMLElement | null
  if (!target) return windowMetrics
  store.__tbxCaptureScrollEl = target
  const rect = target.getBoundingClientRect()
  const top = Math.max(0, rect.top)
  const left = Math.max(0, rect.left)
  return {
    scrollTarget: 'element',
    scrollHeight: target.scrollHeight,
    viewportWidth: target.clientWidth,
    viewportHeight: target.clientHeight,
    scrollY: target.scrollTop,
    devicePixelRatio: dpr,
    clip: {
      x: left,
      y: top,
      width: Math.min(target.clientWidth, window.innerWidth - left),
      height: Math.min(target.clientHeight, window.innerHeight - top),
    },
  }
}

export function scrollCaptureTo(y: number): number {
  const el = (window as unknown as Record<string, HTMLElement | null>).__tbxCaptureScrollEl
  if (el) {
    el.scrollTop = y
    return el.scrollTop
  }
  window.scrollTo(0, y)
  return window.scrollY
}

/** Hides toolbox overlays (capture menu, pickers, toasts, recorder pill) and waits for a repaint. */
export function hideToolboxUi(): Promise<number> {
  const selector =
    '[id^="toolbox-"], [id^="tbx-"], .tbx-wa-toast, .tbx-wa-popover, [data-toolbox-capture]'
  let hidden = 0
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (/^(STYLE|LINK|SCRIPT|META)$/.test(el.tagName)) return
    if (el.hasAttribute('data-tbx-capture-ui-hidden')) return
    el.setAttribute('data-tbx-capture-ui-hidden', el.style.getPropertyValue('visibility'))
    el.style.setProperty('visibility', 'hidden', 'important')
    hidden++
  })
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(hidden), 30)))
  })
}

export function restoreToolboxUi(): void {
  document.querySelectorAll<HTMLElement>('[data-tbx-capture-ui-hidden]').forEach((el) => {
    const previous = el.getAttribute('data-tbx-capture-ui-hidden')
    if (previous) el.style.setProperty('visibility', previous)
    else el.style.removeProperty('visibility')
    el.removeAttribute('data-tbx-capture-ui-hidden')
  })
}

export function disableSmoothScroll(): void {
  const style = document.getElementById('tbx-capture-smooth-off')
  if (style) return
  const el = document.createElement('style')
  el.id = 'tbx-capture-smooth-off'
  el.textContent = 'html { scroll-behavior: auto !important; }'
  document.documentElement.append(el)
}

export function hideFixedStickyAfterFirst(): void {
  const style = document.getElementById('tbx-capture-hide-sticky')
  if (style) return
  const el = document.createElement('style')
  el.id = 'tbx-capture-hide-sticky'
  el.textContent = `
    [data-tbx-capture-sticky-hidden] { visibility: hidden !important; }
  `
  document.documentElement.append(el)
  document.querySelectorAll<HTMLElement>('*').forEach((node) => {
    const pos = getComputedStyle(node).position
    if (pos === 'fixed' || pos === 'sticky') {
      node.setAttribute('data-tbx-capture-sticky-hidden', '1')
    }
  })
}

export function restoreCapturePageState(savedScrollY: number): void {
  const store = window as unknown as Record<string, HTMLElement | null>
  const el = store.__tbxCaptureScrollEl
  if (el) el.scrollTop = savedScrollY
  else window.scrollTo(0, savedScrollY)
  document.getElementById('tbx-capture-smooth-off')?.remove()
  document.getElementById('tbx-capture-hide-sticky')?.remove()
  document.querySelectorAll('[data-tbx-capture-sticky-hidden]').forEach((node) => {
    node.removeAttribute('data-tbx-capture-sticky-hidden')
  })
  store.__tbxCaptureScrollEl = null
}

export function collectPageMeta(): {
  links: { href: string; x: number; y: number; width: number; height: number }[]
  textRuns: { text: string; x: number; y: number; width: number; height: number; fontSize: number }[]
} {
  const links: { href: string; x: number; y: number; width: number; height: number }[] = []
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const href = a.href
    if (!href || href.startsWith('javascript:')) return
    const rect = a.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    links.push({
      href,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    })
  })
  const textRuns: {
    text: string
    x: number
    y: number
    width: number
    height: number
    fontSize: number
  }[] = []
  if (document.body) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode()) && textRuns.length < 5000) {
      const text = node.textContent?.trim()
      if (!text) continue
      const parent = node.parentElement
      if (!parent) continue
      const style = getComputedStyle(parent)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      const range = document.createRange()
      range.selectNodeContents(node)
      const rect = range.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      textRuns.push({
        text,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        fontSize: parseFloat(style.fontSize) || 12,
      })
    }
  }
  return { links, textRuns }
}

export function selectPageAreaWithScroll(): Promise<SelectionCaptureResult | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-toolbox-capture', 'overlay')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(15,23,42,.28)'
    const box = document.createElement('div')
    box.style.cssText =
      'position:fixed;z-index:2147483647;border:2px solid #f97316;background:rgba(249,115,22,.18);display:none;pointer-events:none'
    const hint = document.createElement('div')
    hint.textContent = 'Drag to capture · scroll or hold at the edge to extend · Esc to cancel'
    hint.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111827;color:#fff;font:500 13px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:999px'
    document.documentElement.append(overlay, box, hint)

    // The start point is kept in page coordinates so the selection keeps growing while the
    // page scrolls underneath (edge auto-scroll or the mouse wheel).
    let start: { x: number; y: number } | null = null
    let selecting = false
    let pointer = { x: 0, y: 0 }
    let scrollTimer: number | null = null
    let scrollSpeed = 0

    const docEl = document.documentElement
    const pageWidth = () => Math.max(docEl.scrollWidth, document.body?.scrollWidth ?? 0)
    const pageHeight = () => Math.max(docEl.scrollHeight, document.body?.scrollHeight ?? 0)
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max)

    const currentRect = () => {
      if (!start) return null
      const endX = clamp(pointer.x + window.scrollX, pageWidth())
      const endY = clamp(pointer.y + window.scrollY, pageHeight())
      return {
        x: Math.min(start.x, endX),
        y: Math.min(start.y, endY),
        width: Math.abs(endX - start.x),
        height: Math.abs(endY - start.y),
      }
    }

    const drawBox = () => {
      const rect = currentRect()
      if (!rect) return
      box.style.left = `${rect.x - window.scrollX}px`
      box.style.top = `${rect.y - window.scrollY}px`
      box.style.width = `${rect.width}px`
      box.style.height = `${rect.height}px`
    }

    const stopScroll = () => {
      if (scrollTimer != null) {
        window.clearInterval(scrollTimer)
        scrollTimer = null
      }
      scrollSpeed = 0
    }

    const updateAutoScroll = () => {
      const edge = 48
      const h = window.innerHeight
      let speed = 0
      if (pointer.y < edge) speed = -Math.min(40, 8 + (edge - pointer.y) / 2)
      else if (pointer.y > h - edge) speed = Math.min(40, 8 + (pointer.y - (h - edge)) / 2)
      scrollSpeed = speed
      if (speed === 0) stopScroll()
      else if (scrollTimer == null) {
        scrollTimer = window.setInterval(() => {
          window.scrollBy(0, scrollSpeed)
          drawBox()
          void captureLiveSlice(false)
        }, 16)
      }
    }

    const liveSlices: SelectionLiveSlice[] = []
    let captureBusy = false
    let lastCaptureAt = 0
    const sliceKey = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`
    const seenKeys = new Set<string>()

    const hideChrome = () => {
      overlay.style.visibility = 'hidden'
      box.style.visibility = 'hidden'
      hint.style.visibility = 'hidden'
    }
    const showChrome = () => {
      overlay.style.visibility = ''
      box.style.visibility = ''
      hint.style.visibility = ''
    }

    const captureLiveSlice = async (force = false) => {
      if (!selecting || captureBusy) return
      const now = Date.now()
      if (!force && now - lastCaptureAt < 550) return
      const runtime = typeof chrome !== 'undefined' ? chrome.runtime : undefined
      if (!runtime?.sendMessage) return
      captureBusy = true
      hideChrome()
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      try {
        const response = (await runtime.sendMessage({ type: 'SCREENSHOT_SELECTION_SLICE' })) as {
          slice?: SelectionLiveSlice | null
        }
        const slice = response?.slice
        if (slice?.dataUrl) {
          const key = sliceKey(slice.scrollX, slice.scrollY)
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            liveSlices.push(slice)
            lastCaptureAt = now
          }
        }
      } catch {
        /* ignore */
      } finally {
        showChrome()
        captureBusy = false
      }
    }

    const onScroll = () => {
      drawBox()
      void captureLiveSlice(false)
    }

    const cleanup = (value: SelectionCaptureResult | null) => {
      selecting = false
      start = null
      stopScroll()
      overlay.remove()
      box.remove()
      hint.remove()
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      resolve(value)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(null)
      }
    }

    overlay.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      // Keeps receiving moves and the release even when the pointer leaves the window.
      overlay.setPointerCapture(event.pointerId)
      pointer = { x: event.clientX, y: event.clientY }
      start = { x: event.clientX + window.scrollX, y: event.clientY + window.scrollY }
      selecting = true
      box.style.display = 'block'
      drawBox()
    })
    overlay.addEventListener('pointermove', (event) => {
      if (!start) return
      pointer = { x: event.clientX, y: event.clientY }
      updateAutoScroll()
      drawBox()
    })
    overlay.addEventListener('pointerup', (event) => {
      if (!start) return
      pointer = { x: event.clientX, y: event.clientY }
      stopScroll()
      const rect = currentRect()
      void (async () => {
        await captureLiveSlice(true)
        selecting = false
        start = null
        if (!rect || rect.width < 8 || rect.height < 8) {
          cleanup(null)
          return
        }
        cleanup({
          ...rect,
          devicePixelRatio: window.devicePixelRatio || 1,
          slices: liveSlices,
          savedScrollX: window.scrollX,
          savedScrollY: window.scrollY,
        })
      })()
    })
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
  })
}

export function pickElementRect(): Promise<AreaSelection | null> {
  return new Promise((resolve) => {
    const highlight = document.createElement('div')
    highlight.style.cssText =
      'position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #22c55e;background:rgba(34,197,94,.15);display:none'
    const hint = document.createElement('div')
    hint.textContent = 'Click element · Esc to cancel'
    hint.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111827;color:#fff;font:500 13px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:999px'
    document.documentElement.append(highlight, hint)

    let target: Element | null = null

    const cleanup = (value: AreaSelection | null) => {
      highlight.remove()
      hint.remove()
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKey, true)
      resolve(value)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(null)
      }
    }

    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY)
      if (!el || el === highlight || el === hint) return
      target = el
      const rect = el.getBoundingClientRect()
      highlight.style.display = 'block'
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
    }

    const onClick = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!target) {
        cleanup(null)
        return
      }
      const rect = target.getBoundingClientRect()
      cleanup({
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: window.devicePixelRatio || 1,
      })
    }

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKey, true)
  })
}
