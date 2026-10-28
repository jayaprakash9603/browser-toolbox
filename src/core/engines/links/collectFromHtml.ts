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

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

function extractTitle(html: string): string {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return collapse(match?.[1]?.replace(/<[^>]+>/g, ' '))
}

function resolveHref(rawHref: string, pageUrl: string, baseUrl: string): string {
  const raw = rawHref.trim()
  if (!raw || raw.startsWith('#')) return ''
  try {
    return new URL(raw, baseUrl || pageUrl).href
  } catch {
    return ''
  }
}

function linkLabel(anchor: Element): { text: string; source: LinkTextSource } {
  const text = collapse(anchor.textContent)
  if (text) return { text: text.slice(0, MAX_TEXT), source: 'text' }
  const aria = collapse(anchor.getAttribute('aria-label'))
  if (aria) return { text: aria.slice(0, MAX_TEXT), source: 'aria' }
  const title = collapse(anchor.getAttribute('title'))
  if (title) return { text: title.slice(0, MAX_TEXT), source: 'title' }
  const image = anchor.querySelector('img[alt], svg title, [role="img"][aria-label]')
  const imageText = collapse(image?.getAttribute('alt') ?? image?.getAttribute('aria-label') ?? image?.textContent)
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

/** Collect http(s) links from static HTML (used when crawling pages off the active tab). */
export function collectPageLinksFromHtml(html: string, pageUrl: string, title?: string): PageLinksSnapshot {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let baseUrl = pageUrl
  const baseTag = doc.querySelector('base[href]')
  if (baseTag) {
    const href = baseTag.getAttribute('href')
    if (href) {
      try {
        baseUrl = new URL(href, pageUrl).href
      } catch {
        /* keep page URL */
      }
    }
  }

  let pageHost = ''
  let pageProtocol = ''
  try {
    const page = new URL(pageUrl)
    pageHost = bareHost(page.hostname)
    pageProtocol = page.protocol
  } catch {
    /* invalid page URL */
  }

  const anchors = [...doc.querySelectorAll<HTMLAnchorElement>('a[href], area[href]')]
  const slice = anchors.slice(0, MAX_LINKS)
  const links: PageLink[] = slice.map((anchor, index) => {
    const rawHref = anchor.getAttribute('href') ?? ''
    const href = resolveHref(rawHref, pageUrl, baseUrl)
    const kind = classifyHref(rawHref, href || rawHref, pageUrl)
    const rel = collapse(anchor.getAttribute('rel')).toLowerCase().split(' ').filter(Boolean)
    const label = linkLabel(anchor)
    let host = ''
    let protocol = ''
    try {
      const url = new URL(href)
      host = bareHost(url.hostname)
      protocol = url.protocol
    } catch {
      /* unparseable */
    }
    return {
      index,
      href: href || rawHref,
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
      visible: true,
      anchorMissing: false,
    }
  })

  return {
    url: pageUrl,
    title: title ?? extractTitle(html),
    host: pageHost,
    links,
    truncated: anchors.length > MAX_LINKS,
  }
}

export function mergePageLinkSnapshots(snapshots: readonly PageLinksSnapshot[]): PageLinksSnapshot | null {
  if (snapshots.length === 0) return null
  const primary = snapshots[0]
  const links: PageLink[] = []
  for (const snap of snapshots) {
    for (const link of snap.links) {
      links.push({ ...link, index: links.length })
      if (links.length >= MAX_LINKS) break
    }
    if (links.length >= MAX_LINKS) break
  }
  return {
    url: primary.url,
    title: primary.title,
    host: primary.host,
    links,
    truncated: links.length >= MAX_LINKS || snapshots.some((snap) => snap.truncated),
  }
}
