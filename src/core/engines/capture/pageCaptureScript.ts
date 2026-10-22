import type { AreaSelection, PageCaptureMetrics } from './pageActions'

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

export function selectPageAreaWithScroll(): Promise<AreaSelection | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-toolbox-capture', 'overlay')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:rgba(15,23,42,.28)'
    const box = document.createElement('div')
    box.style.cssText =
      'position:fixed;z-index:2147483647;border:2px solid #f97316;background:rgba(249,115,22,.18);display:none;pointer-events:none'
    const hint = document.createElement('div')
    hint.textContent = 'Drag to capture · auto-scroll at edges · Esc to cancel'
    hint.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111827;color:#fff;font:500 13px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:999px'
    document.documentElement.append(overlay, box, hint)

    let start: { x: number; y: number } | null = null
    let scrollTimer: number | null = null

    const stopScroll = () => {
      if (scrollTimer != null) {
        window.clearInterval(scrollTimer)
        scrollTimer = null
      }
    }

    const maybeAutoScroll = (clientY: number) => {
      const edge = 48
      const speed = 14
      stopScroll()
      if (clientY < edge) {
        scrollTimer = window.setInterval(() => window.scrollBy(0, -speed), 16)
      } else if (clientY > window.innerHeight - edge) {
        scrollTimer = window.setInterval(() => window.scrollBy(0, speed), 16)
      }
    }

    const cleanup = (value: AreaSelection | null) => {
      stopScroll()
      overlay.remove()
      box.remove()
      hint.remove()
      window.removeEventListener('keydown', onKey, true)
      resolve(value)
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cleanup(null)
      }
    }

    overlay.addEventListener('mousedown', (event) => {
      start = { x: event.clientX, y: event.clientY }
      box.style.display = 'block'
      box.style.left = `${start.x}px`
      box.style.top = `${start.y}px`
      box.style.width = '0px'
      box.style.height = '0px'
    })
    overlay.addEventListener('mousemove', (event) => {
      if (!start) return
      maybeAutoScroll(event.clientY)
      const x = Math.min(start.x, event.clientX)
      const y = Math.min(start.y, event.clientY)
      box.style.left = `${x}px`
      box.style.top = `${y}px`
      box.style.width = `${Math.abs(event.clientX - start.x)}px`
      box.style.height = `${Math.abs(event.clientY - start.y)}px`
    })
    overlay.addEventListener('mouseup', (event) => {
      if (!start) return
      stopScroll()
      const x = Math.min(start.x, event.clientX)
      const y = Math.min(start.y, event.clientY)
      const width = Math.abs(event.clientX - start.x)
      const height = Math.abs(event.clientY - start.y)
      cleanup(
        width < 8 || height < 8
          ? null
          : {
              x: x + window.scrollX,
              y: y + window.scrollY,
              width,
              height,
              devicePixelRatio: window.devicePixelRatio || 1,
            },
      )
    })
    window.addEventListener('keydown', onKey, true)
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
