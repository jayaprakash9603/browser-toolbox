import type { AreaSelection, PageCaptureMetrics } from './pageActions'

export interface ScrollTargetMetrics extends PageCaptureMetrics {
  scrollTarget: 'window' | 'element'
  elementSelector?: string
}

export function findLargestScrollable(): HTMLElement | null {
  const candidates: HTMLElement[] = [document.documentElement, document.body]
  document.querySelectorAll<HTMLElement>('div, main, section, article').forEach((el) => {
    const style = getComputedStyle(el)
    const overflowY = style.overflowY
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 8
    ) {
      candidates.push(el)
    }
  })
  let best: HTMLElement | null = null
  let bestArea = 0
  for (const el of candidates) {
    const area = el.clientWidth * el.scrollHeight
    if (area > bestArea) {
      bestArea = area
      best = el
    }
  }
  if (best && best !== document.documentElement && best !== document.body) return best
  const docScroll = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)
  if (docScroll > window.innerHeight + 8) return null
  return best
}

export function readScrollTargetMetrics(): ScrollTargetMetrics {
  const dpr = window.devicePixelRatio || 1
  const bound = getScrollElement()
  if (bound) {
    return {
      scrollTarget: 'element',
      elementSelector: '',
      scrollHeight: bound.scrollHeight,
      viewportWidth: bound.clientWidth,
      viewportHeight: bound.clientHeight,
      scrollY: bound.scrollTop,
      devicePixelRatio: dpr,
    }
  }
  const target = findLargestScrollable()
  if (!target || target === document.documentElement || target === document.body) {
    const root = document.documentElement
    const body = document.body
    return {
      scrollTarget: 'window',
      scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0, root.clientHeight),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY,
      devicePixelRatio: dpr,
    }
  }
  return {
    scrollTarget: 'element',
    elementSelector: '',
    scrollHeight: target.scrollHeight,
    viewportWidth: target.clientWidth,
    viewportHeight: target.clientHeight,
    scrollY: target.scrollTop,
    devicePixelRatio: dpr,
  }
}

const SCROLL_KEY = '__tbxCaptureScrollEl'

function getScrollElement(): HTMLElement | null {
  return (window as unknown as Record<string, HTMLElement | null>)[SCROLL_KEY] ?? null
}

export function prepareEntireCaptureScrollTarget(): ScrollTargetMetrics {
  const target = findLargestScrollable()
  const w = window as unknown as Record<string, HTMLElement | null>
  if (target && target !== document.documentElement && target !== document.body) {
    w[SCROLL_KEY] = target
  } else {
    w[SCROLL_KEY] = null
  }
  return readScrollTargetMetrics()
}

export function scrollCaptureTo(y: number): number {
  const scrollElement = getScrollElement()
  if (scrollElement) {
    scrollElement.scrollTop = y
    return scrollElement.scrollTop
  }
  window.scrollTo(0, y)
  return window.scrollY
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
  scrollCaptureTo(savedScrollY)
  document.getElementById('tbx-capture-smooth-off')?.remove()
  document.getElementById('tbx-capture-hide-sticky')?.remove()
  document.querySelectorAll('[data-tbx-capture-sticky-hidden]').forEach((node) => {
    node.removeAttribute('data-tbx-capture-sticky-hidden')
  })
  const w = window as unknown as Record<string, HTMLElement | null>
  w[SCROLL_KEY] = null
}

export function collectLinkRects(): { href: string; x: number; y: number; width: number; height: number }[] {
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
  return links
}

export function collectPageMeta(): {
  links: ReturnType<typeof collectLinkRects>
  textRuns: ReturnType<typeof collectTextRuns>
} {
  return { links: collectLinkRects(), textRuns: collectTextRuns() }
}

export function collectTextRuns(): {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}[] {
  const runs: {
    text: string
    x: number
    y: number
    width: number
    height: number
    fontSize: number
  }[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
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
    runs.push({
      text,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      fontSize: parseFloat(style.fontSize) || 12,
    })
  }
  return runs
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
