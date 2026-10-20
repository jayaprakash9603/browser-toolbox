import type { SeoHighlightKind } from '@/core/engines/seo/types'

const STYLE_ID = 'browser-toolbox-seo-highlight'

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .bt-seo-highlight {
      outline: 2px solid #f59e0b !important;
      outline-offset: 2px !important;
      background-color: rgba(245, 158, 11, 0.12) !important;
    }
  `
  document.head.appendChild(style)
}

function clearHighlight(): void {
  document.querySelectorAll('.bt-seo-highlight').forEach((el) => {
    el.classList.remove('bt-seo-highlight')
  })
}

function highlightElements(elements: Element[]): void {
  clearHighlight()
  ensureStyle()
  elements.forEach((el) => el.classList.add('bt-seo-highlight'))
  elements[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function applySeoHighlight(kind: SeoHighlightKind): number {
  const pageHost = window.location.hostname
  const origin = window.location.origin

  switch (kind) {
    case 'headings': {
      const els = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      highlightElements(els)
      return els.length
    }
    case 'images-all': {
      const els = [...document.querySelectorAll('img')]
      highlightElements(els)
      return els.length
    }
    case 'images-missing-alt': {
      const els = [...document.querySelectorAll('img')].filter((img) => {
        const alt = img.getAttribute('alt')
        return alt === null || !alt.trim()
      })
      highlightElements(els)
      return els.length
    }
    case 'hreflang': {
      const els = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
      highlightElements(els)
      return els.length
    }
    case 'links-nofollow': {
      const els = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) =>
        (a.getAttribute('rel') ?? '').toLowerCase().includes('nofollow'),
      )
      highlightElements(els)
      return els.length
    }
    case 'links-internal': {
      const els = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) => {
        const href = a.href
        return href.startsWith(origin) || a.getAttribute('href')?.startsWith('/') === true
      })
      highlightElements(els)
      return els.length
    }
    case 'links-external': {
      const els = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) => {
        try {
          const u = new URL(a.href)
          return u.hostname !== pageHost && !a.href.startsWith(origin)
        } catch {
          return false
        }
      })
      highlightElements(els)
      return els.length
    }
    default:
      return 0
  }
}

export function clearSeoHighlight(): void {
  clearHighlight()
}
