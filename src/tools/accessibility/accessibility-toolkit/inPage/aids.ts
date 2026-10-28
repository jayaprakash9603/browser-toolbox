export type VisionMode =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia'
  | 'blurred'
  | 'lowContrast'

export interface A11yAidState {
  vision: VisionMode
  tabOrder: boolean
  headings: boolean
  landmarks: boolean
  altText: boolean
  focusRing: boolean
  textSpacing: boolean
  pauseMotion: boolean
  hideStyles: boolean
}

export type A11yOverlayAid = 'tabOrder' | 'headings' | 'landmarks' | 'altText'
export type A11yStyleAid = 'focusRing' | 'textSpacing' | 'pauseMotion' | 'hideStyles'

export const DEFAULT_AIDS: A11yAidState = {
  vision: 'none',
  tabOrder: false,
  headings: false,
  landmarks: false,
  altText: false,
  focusRing: false,
  textSpacing: false,
  pauseMotion: false,
  hideStyles: false,
}

export interface A11yAidCounts {
  tabStops: number
  headings: number
  landmarks: number
  images: number
}

export interface HighlightTarget {
  selector: string
  label?: string
}

export type HighlightTone = 'error' | 'warning' | 'notice'

/**
 * Applies the visual aids to the page. Injected with chrome.scripting.executeScript, so it must
 * stay self-contained. Overlays live in a shadow root so page CSS cannot restyle them.
 */
export function applyPageAids(state: A11yAidState): A11yAidCounts {
  const KEY = '__onePanelA11yAids'
  const STYLE_ID = 'one-panel-a11y-aids-style'
  const SVG_ID = 'one-panel-a11y-aids-filters'
  const HOST_ID = 'one-panel-a11y-aids-overlay'
  type Store = { disabledSheets: CSSStyleSheet[]; onResize?: () => void; timer?: number }
  const scope = window as unknown as Record<string, Store | undefined>
  const store: Store = scope[KEY] ?? (scope[KEY] = { disabledSheets: [] })
  const doc = document
  const root = doc.documentElement

  const MATRICES: Record<string, string> = {
    protanopia: '0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0',
    deuteranopia: '0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0',
    tritanopia: '0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0',
  }
  const matrix = MATRICES[state.vision]
  const existingSvg = doc.getElementById(SVG_ID)
  if (matrix && !existingSvg) {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = SVG_ID
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden')
    svg.innerHTML = Object.entries(MATRICES)
      .map(
        ([name, values]) =>
          `<filter id="one-panel-a11y-${name}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${values}"/></filter>`,
      )
      .join('')
    root.appendChild(svg)
  } else if (!matrix) {
    existingSvg?.remove()
  }

  const filters: Record<string, string> = {
    achromatopsia: 'grayscale(1)',
    blurred: 'blur(2px)',
    lowContrast: 'contrast(0.55) brightness(1.15)',
  }
  const filter = matrix ? `url(#one-panel-a11y-${state.vision})` : (filters[state.vision] ?? '')
  const css: string[] = []
  if (filter) css.push(`html{filter:${filter} !important}`)
  if (state.focusRing) {
    css.push(
      '*:focus,*:focus-visible{outline:3px solid #c026d3 !important;outline-offset:2px !important;box-shadow:0 0 0 6px rgba(192,38,211,.3) !important}',
    )
  }
  if (state.textSpacing) {
    css.push('*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}p{margin-bottom:2em !important}')
  }
  if (state.pauseMotion) {
    css.push(
      '*,*::before,*::after{animation-play-state:paused !important;transition:none !important;scroll-behavior:auto !important}',
    )
  }
  let style = doc.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (css.length) {
    if (!style) {
      style = doc.createElement('style')
      style.id = STYLE_ID
      root.appendChild(style)
    }
    style.textContent = css.join('\n')
  } else {
    style?.remove()
    style = null
  }

  if (state.hideStyles) {
    for (const sheet of Array.from(doc.styleSheets)) {
      if (sheet.ownerNode === style || sheet.disabled) continue
      sheet.disabled = true
      store.disabledSheets.push(sheet as CSSStyleSheet)
    }
  } else {
    for (const sheet of store.disabledSheets) sheet.disabled = false
    store.disabledSheets = []
  }

  doc.getElementById(HOST_ID)?.remove()
  if (store.onResize) {
    window.removeEventListener('resize', store.onResize)
    store.onResize = undefined
  }
  const counts: A11yAidCounts = { tabStops: 0, headings: 0, landmarks: 0, images: 0 }
  if (!state.tabOrder && !state.headings && !state.landmarks && !state.altText) return counts

  const FOCUSABLE =
    'a[href], area[href], button, input:not([type="hidden" i]), select, textarea, iframe, summary, audio[controls], video[controls], [contenteditable=""], [contenteditable="true" i], [tabindex]'
  const CAP = 300
  const visibleRect = (el: Element) => {
    const rect = el.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 ? rect : null
  }
  const escape = (value: string) =>
    value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)
  const squash = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()
  const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

  const draw = () => {
    doc.getElementById(HOST_ID)?.remove()
    const host = doc.createElement('div')
    host.id = HOST_ID
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText =
      'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483646;pointer-events:none;'
    const shadow = host.attachShadow({ mode: 'open' })
    const x = window.scrollX
    const y = window.scrollY
    const parts: string[] = []
    const box = (rect: DOMRect, cls: string, label: string, labelCls = '') => {
      const left = rect.left + x
      const top = rect.top + y
      parts.push(
        `<div class="b ${cls}" style="left:${left}px;top:${top}px;width:${rect.width}px;height:${rect.height}px"></div>`,
      )
      if (label) {
        parts.push(
          `<div class="t ${cls} ${labelCls}" style="left:${left}px;top:${Math.max(0, top - 18)}px">${escape(label)}</div>`,
        )
      }
    }

    if (state.tabOrder) {
      const stops = Array.from(doc.querySelectorAll(FOCUSABLE))
        .filter((el) => el.getAttribute('tabindex') !== '-1' && !(el as HTMLButtonElement).disabled)
        .map((el, index) => ({ el, index, tab: Number.parseInt(el.getAttribute('tabindex') ?? '0', 10) || 0 }))
        .sort((a, b) => {
          const pa = a.tab > 0 ? a.tab : Number.MAX_SAFE_INTEGER
          const pb = b.tab > 0 ? b.tab : Number.MAX_SAFE_INTEGER
          return pa - pb || a.index - b.index
        })
      const points: string[] = []
      let order = 0
      for (const { el } of stops) {
        if (order >= CAP) break
        const rect = visibleRect(el)
        if (!rect) continue
        order += 1
        points.push(`${rect.left + x + rect.width / 2},${rect.top + y + rect.height / 2}`)
        box(rect, 'tab', String(order), 'num')
      }
      counts.tabStops = order
      if (points.length > 1) {
        const width = Math.max(root.scrollWidth, doc.body?.scrollWidth ?? 0)
        const height = Math.max(root.scrollHeight, doc.body?.scrollHeight ?? 0)
        parts.unshift(
          `<svg class="path" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polyline points="${points.join(' ')}"/></svg>`,
        )
      }
    }

    if (state.headings) {
      for (const el of Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')).slice(0, CAP)) {
        const rect = visibleRect(el)
        if (!rect) continue
        const level = Number(el.getAttribute('aria-level')) || Number(el.tagName.slice(1)) || 2
        counts.headings += 1
        box(rect, 'h', `H${level} ${clip(squash(el.textContent), 40)}`)
      }
    }

    if (state.landmarks) {
      const IMPLICIT: Record<string, string> = {
        HEADER: 'banner',
        FOOTER: 'contentinfo',
        NAV: 'navigation',
        MAIN: 'main',
        ASIDE: 'complementary',
        SEARCH: 'search',
      }
      const ROLES = new Set(['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'region', 'form'])
      for (const el of Array.from(doc.querySelectorAll('header, footer, nav, main, aside, search, [role]')).slice(0, CAP)) {
        const explicit = squash(el.getAttribute('role')).split(' ')[0]
        const role = ROLES.has(explicit) ? explicit : explicit ? '' : (IMPLICIT[el.tagName] ?? '')
        if (!role) continue
        if ((el.tagName === 'HEADER' || el.tagName === 'FOOTER') && !explicit && el.parentElement?.closest('article, aside, main, nav, section')) continue
        const rect = visibleRect(el)
        if (!rect) continue
        counts.landmarks += 1
        const name = squash(el.getAttribute('aria-label'))
        box(rect, 'lm', name ? `${role}: ${clip(name, 30)}` : role)
      }
    }

    if (state.altText) {
      for (const el of Array.from(doc.querySelectorAll('img, [role="img"]')).slice(0, CAP)) {
        const rect = visibleRect(el)
        if (!rect || rect.width < 12 || rect.height < 12) continue
        counts.images += 1
        const alt = el.getAttribute('alt')
        const named = squash(el.getAttribute('aria-label'))
        const label = named || (alt === null ? '' : squash(alt))
        if (label) box(rect, 'alt', `alt: ${clip(label, 50)}`)
        else if (alt === '' || el.getAttribute('role') === 'presentation') box(rect, 'alt', 'decorative', 'empty')
        else box(rect, 'alt', 'no alt', 'missing')
      }
    }

    shadow.innerHTML = `<style>
      :host{all:initial}
      .b{position:absolute;box-sizing:border-box;border-radius:4px}
      .t{position:absolute;box-sizing:border-box;font:600 11px/16px system-ui,-apple-system,"Segoe UI",sans-serif;padding:1px 6px;border-radius:999px;color:#fff;white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px rgba(0,0,0,.25);animation:pop .28s cubic-bezier(.2,.9,.3,1.25) both}
      .b.tab{border:2px solid #7c3aed;background:rgba(124,58,237,.06)}
      .t.num{min-width:20px;height:20px;padding:0 5px;display:flex;align-items:center;justify-content:center;background:#7c3aed;font-size:10px}
      .b.h{border:2px dashed #0284c7;background:rgba(2,132,199,.05)} .t.h{background:#0284c7}
      .b.lm{border:3px solid #059669} .t.lm{background:#059669;text-transform:capitalize}
      .b.alt{border:2px solid #16a34a} .t.alt{background:#16a34a}
      .t.alt.empty{background:#64748b} .t.alt.missing{background:#dc2626}
      .path{position:absolute;left:0;top:0;overflow:visible}
      .path polyline{fill:none;stroke:#7c3aed;stroke-width:2;stroke-dasharray:7 5;opacity:.6;animation:flow 1.1s linear infinite}
      @keyframes pop{from{opacity:0;transform:translateY(3px) scale(.85)}to{opacity:1;transform:none}}
      @keyframes flow{to{stroke-dashoffset:-24}}
      @media (prefers-reduced-motion:reduce){.t,.path polyline{animation:none}}
    </style>${parts.join('')}`
    root.appendChild(host)
  }

  draw()
  store.onResize = () => {
    window.clearTimeout(store.timer)
    store.timer = window.setTimeout(draw, 160)
  }
  window.addEventListener('resize', store.onResize)
  return counts
}

/** Draws pulsing boxes around the given elements and scrolls the first into view. Self-contained. */
export function highlightOnPage(targets: HighlightTarget[], tone: HighlightTone, scroll: boolean): number {
  const KEY = '__onePanelA11yHighlight'
  const HOST_ID = 'one-panel-a11y-highlight'
  type Store = { onResize?: () => void; timer?: number }
  const scope = window as unknown as Record<string, Store | undefined>
  const store: Store = scope[KEY] ?? (scope[KEY] = {})
  const doc = document
  doc.getElementById(HOST_ID)?.remove()
  if (store.onResize) {
    window.removeEventListener('resize', store.onResize)
    store.onResize = undefined
  }

  const found = targets
    .map((target) => {
      try {
        return target.selector ? { el: doc.querySelector(target.selector), label: target.label ?? '' } : null
      } catch {
        return null
      }
    })
    .filter((entry): entry is { el: Element; label: string } => Boolean(entry?.el))
  if (!found.length) return 0

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (scroll) found[0].el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' })

  const COLORS: Record<HighlightTone, [string, string]> = {
    error: ['#dc2626', 'rgba(220,38,38,'],
    warning: ['#d97706', 'rgba(217,119,6,'],
    notice: ['#2563eb', 'rgba(37,99,235,'],
  }
  const [solid, rgba] = COLORS[tone] ?? COLORS.notice
  const escape = (value: string) =>
    value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)

  const draw = () => {
    doc.getElementById(HOST_ID)?.remove()
    const host = doc.createElement('div')
    host.id = HOST_ID
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText =
      'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;'
    const shadow = host.attachShadow({ mode: 'open' })
    const x = window.scrollX
    const y = window.scrollY
    const boxes = found
      .map(({ el, label }, index) => {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) return ''
        const pad = 3
        const left = rect.left + x - pad
        const top = rect.top + y - pad
        const tag = label || (found.length > 1 ? String(index + 1) : '')
        return `<div class="b" style="left:${left}px;top:${top}px;width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;animation-delay:${Math.min(index, 12) * 40}ms"></div>${
          tag ? `<div class="t" style="left:${left}px;top:${Math.max(0, top - 20)}px">${escape(tag)}</div>` : ''
        }`
      })
      .join('')
    shadow.innerHTML = `<style>
      :host{all:initial}
      .b{position:absolute;box-sizing:border-box;border:2px solid ${solid};border-radius:6px;background:${rgba}.1);animation:ring 1.1s ease-out 3 both}
      .t{position:absolute;font:600 11px/16px system-ui,-apple-system,"Segoe UI",sans-serif;padding:1px 7px;border-radius:999px;background:${solid};color:#fff;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px rgba(0,0,0,.25)}
      @keyframes ring{0%{box-shadow:0 0 0 0 ${rgba}.55)}100%{box-shadow:0 0 0 14px ${rgba}0)}}
      @media (prefers-reduced-motion:reduce){.b{animation:none}}
    </style>${boxes}`
    doc.documentElement.appendChild(host)
  }

  draw()
  store.onResize = () => {
    window.clearTimeout(store.timer)
    store.timer = window.setTimeout(draw, 160)
  }
  window.addEventListener('resize', store.onResize)
  return found.length
}

export function clearPageHighlight(): void {
  const KEY = '__onePanelA11yHighlight'
  type Store = { onResize?: () => void; timer?: number }
  const store = (window as unknown as Record<string, Store | undefined>)[KEY]
  document.getElementById('one-panel-a11y-highlight')?.remove()
  if (store?.onResize) {
    window.removeEventListener('resize', store.onResize)
    store.onResize = undefined
  }
}
