import {
  bareHost,
  classifyHref,
  isFileUrl,
  type LinkSection,
  type LinkTextSource,
  type PageLink,
  type PageLinksSnapshot,
} from '@/core/engines/links/pageLinks'

const MAX_LINKS = 5000
const MAX_TEXT = 160
const HIGHLIGHT_ID = 'toolbox-link-locator'
const HIGHLIGHT_MS = 2200

let collected: HTMLAnchorElement[] = []

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

function linkLabel(anchor: HTMLAnchorElement): { text: string; source: LinkTextSource } {
  const text = collapse(anchor.textContent)
  if (text) return { text: text.slice(0, MAX_TEXT), source: 'text' }
  const aria = collapse(anchor.getAttribute('aria-label'))
  if (aria) return { text: aria.slice(0, MAX_TEXT), source: 'aria' }
  const labelledBy = anchor.getAttribute('aria-labelledby')
  if (labelledBy) {
    const doc = anchor.ownerDocument
    const label = collapse(labelledBy.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? '').join(' '))
    if (label) return { text: label.slice(0, MAX_TEXT), source: 'aria' }
  }
  const title = collapse(anchor.getAttribute('title'))
  if (title) return { text: title.slice(0, MAX_TEXT), source: 'title' }
  const image = anchor.querySelector('img[alt], svg title, [role="img"][aria-label]')
  const imageText = collapse(
    image?.getAttribute('alt') ?? image?.getAttribute('aria-label') ?? image?.textContent,
  )
  if (imageText) return { text: imageText.slice(0, MAX_TEXT), source: 'image' }
  return { text: '', source: 'none' }
}

function sectionOf(anchor: Element): LinkSection {
  if (anchor.closest('nav, [role="navigation"]')) return 'nav'
  if (anchor.closest('footer, [role="contentinfo"]')) return 'footer'
  if (anchor.closest('aside, [role="complementary"]')) return 'aside'
  if (anchor.closest('header, [role="banner"]')) return 'header'
  if (anchor.closest('main, [role="main"], article')) return 'main'
  return 'other'
}

function isVisible(anchor: HTMLAnchorElement): boolean {
  if (typeof anchor.checkVisibility !== 'function') return true
  if (!anchor.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false
  return anchor.getClientRects().length > 0
}

function anchorTargetMissing(doc: Document, href: string, rawHref: string): boolean {
  const hash = rawHref.startsWith('#') ? rawHref : (() => {
    try {
      return new URL(href).hash
    } catch {
      return ''
    }
  })()
  if (!hash || hash === '#') return false
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    // Keep the raw fragment when it isn't valid percent-encoding.
  }
  if (!id || id.toLowerCase() === 'top' || id.startsWith('!') || id.startsWith('/')) return false
  return !doc.getElementById(id) && doc.getElementsByName(id).length === 0
}

export function collectPageLinks(doc: Document = document): PageLinksSnapshot {
  const pageUrl = doc.location?.href ?? ''
  let pageHost = ''
  let pageProtocol = ''
  try {
    const page = new URL(pageUrl)
    pageHost = bareHost(page.hostname)
    pageProtocol = page.protocol
  } catch {
    // about:blank and similar pages have no host.
  }

  const anchors = [...doc.querySelectorAll<HTMLAnchorElement>('a[href], area[href]')] as HTMLAnchorElement[]
  collected = anchors.slice(0, MAX_LINKS)

  const links: PageLink[] = collected.map((anchor, index) => {
    const rawHref = anchor.getAttribute('href') ?? ''
    const href = anchor.href
    const kind = classifyHref(rawHref, href, pageUrl)
    const rel = collapse(anchor.getAttribute('rel')).toLowerCase().split(' ').filter(Boolean)
    const label = linkLabel(anchor)
    let host = ''
    let protocol = ''
    try {
      const url = new URL(href)
      host = bareHost(url.hostname)
      protocol = url.protocol
    } catch {
      // Unparseable hrefs keep an empty host and protocol.
    }
    return {
      index,
      href,
      rawHref,
      text: label.text,
      textSource: label.source,
      kind,
      host: kind === 'anchor' ? pageHost : host,
      section: sectionOf(anchor),
      rel,
      nofollow: rel.some((token) => token === 'nofollow' || token === 'sponsored' || token === 'ugc'),
      newTab: (anchor.getAttribute('target') ?? '').toLowerCase() === '_blank',
      download: anchor.hasAttribute('download') || isFileUrl(href),
      insecure: pageProtocol === 'https:' && protocol === 'http:',
      visible: isVisible(anchor),
      anchorMissing: kind === 'anchor' && anchorTargetMissing(doc, href, rawHref),
    }
  })

  return {
    url: pageUrl,
    title: collapse(doc.title),
    host: pageHost,
    links,
    truncated: anchors.length > MAX_LINKS,
  }
}

function findAnchor(doc: Document, index: number, href: string): HTMLAnchorElement | null {
  const known = collected[index]
  if (known?.isConnected && known.href === href) return known
  return (
    [...doc.querySelectorAll<HTMLAnchorElement>('a[href], area[href]')].find((anchor) => anchor.href === href) ?? null
  )
}

function showHighlight(doc: Document, target: HTMLElement) {
  doc.getElementById(HIGHLIGHT_ID)?.remove()
  const box = doc.createElement('div')
  box.id = HIGHLIGHT_ID
  box.style.cssText =
    'position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #3b82f6;border-radius:6px;background:rgba(59,130,246,.12);box-shadow:0 0 0 4px rgba(59,130,246,.25);transition:opacity .2s ease;'
  doc.documentElement.appendChild(box)

  const started = performance.now()
  const track = () => {
    const rect = target.getBoundingClientRect()
    box.style.left = `${rect.left - 4}px`
    box.style.top = `${rect.top - 4}px`
    box.style.width = `${rect.width + 8}px`
    box.style.height = `${rect.height + 8}px`
    const elapsed = performance.now() - started
    if (elapsed > HIGHLIGHT_MS - 200) box.style.opacity = '0'
    if (elapsed < HIGHLIGHT_MS && box.isConnected) requestAnimationFrame(track)
    else box.remove()
  }
  requestAnimationFrame(track)
  box.animate?.(
    [{ boxShadow: '0 0 0 4px rgba(59,130,246,.35)' }, { boxShadow: '0 0 0 10px rgba(59,130,246,0)' }],
    { duration: 700, iterations: 3, easing: 'ease-out' },
  )
}

export function locatePageLink(index: number, href: string, doc: Document = document): { found: boolean; visible: boolean } {
  const anchor = findAnchor(doc, index, href)
  if (!anchor) return { found: false, visible: false }
  if (!isVisible(anchor)) return { found: true, visible: false }
  const reduceMotion = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  anchor.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  showHighlight(doc, anchor)
  return { found: true, visible: true }
}
