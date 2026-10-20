import type { SeoPageData } from '@/core/engines/seo/types'

function metaContent(name: string): string | null {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null
}

function visibleBodyText(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove())
  return (clone.innerText ?? clone.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function collectSeoData(): SeoPageData {
  const openGraph: Record<string, string> = {}
  document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]').forEach((node) => {
    openGraph[node.getAttribute('property') ?? ''] = node.content
  })
  const twitter: Record<string, string> = {}
  document.querySelectorAll<HTMLMetaElement>('meta[name^="twitter:"]').forEach((node) => {
    twitter[node.getAttribute('name') ?? ''] = node.content
  })

  const pageHost = window.location.hostname
  const origin = window.location.origin

  const linkNodes = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
  const links = linkNodes.map((anchor, index) => {
    const href = anchor.href
    const rel = (anchor.getAttribute('rel') ?? '').toLowerCase()
    const relParts = rel.split(/\s+/)
    let internal =
      href.startsWith(origin) || anchor.getAttribute('href')?.startsWith('/') === true
    let subdomain = false
    try {
      const linkHost = new URL(href).hostname
      if (!internal && linkHost.endsWith(pageHost) && linkHost !== pageHost) subdomain = true
    } catch {
      /* invalid url */
    }
    return {
      href,
      text: (anchor.textContent ?? '').trim().slice(0, 200),
      internal,
      subdomain,
      nofollow: relParts.includes('nofollow'),
      sponsored: relParts.includes('sponsored'),
      ugc: relParts.includes('ugc'),
      targetBlank: anchor.target === '_blank',
      rel,
      index,
    }
  })

  const imageNodes = [...document.querySelectorAll<HTMLImageElement>('img')]
  const images = imageNodes.map((img, index) => ({
    src: img.currentSrc || img.src,
    alt: img.getAttribute('alt'),
    title: img.getAttribute('title'),
    width: img.naturalWidth,
    height: img.naturalHeight,
    hasWidthAttr: img.hasAttribute('width'),
    hasHeightAttr: img.hasAttribute('height'),
    loading: img.getAttribute('loading'),
    index,
  }))

  const headingNodes = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
  const headings = headingNodes.map((heading, index) => ({
    level: Number(heading.tagName[1]),
    text: (heading.textContent ?? '').trim().slice(0, 200),
    index,
  }))

  const hreflangs = [...document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')].map(
    (link) => ({
      href: link.href,
      hreflang: link.getAttribute('hreflang') ?? '',
    }),
  )

  const jsonLd: SeoPageData['jsonLd'] = []
  document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((node) => {
    const raw = node.textContent ?? ''
    if (!raw.trim()) return
    try {
      jsonLd.push({ raw, parsed: JSON.parse(raw) })
    } catch (error: unknown) {
      jsonLd.push({
        raw,
        parsed: null,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      })
    }
  })

  const bodyText = visibleBodyText()
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined

  let doctype = ''
  if (document.doctype) {
    doctype = `<!DOCTYPE ${document.doctype.name}${document.doctype.publicId ? ` PUBLIC "${document.doctype.publicId}"` : ''}${document.doctype.systemId ? ` "${document.doctype.systemId}"` : ''}>`
  }

  const head = document.head
  const renderBlockingScriptsInHead = [...head.querySelectorAll('script[src]')].filter((script) => {
    const async = script.hasAttribute('async')
    const defer = script.hasAttribute('defer')
    const type = (script.getAttribute('type') ?? '').toLowerCase()
    if (type && type !== 'text/javascript' && type !== 'module' && type !== 'application/javascript') {
      return false
    }
    return !async && !defer
  }).length

  let inlineStyleBytes = 0
  document.querySelectorAll('style').forEach((style) => {
    inlineStyleBytes += (style.textContent ?? '').length
  })

  return {
    url: window.location.href,
    title: document.title,
    metaDescription: metaContent('description'),
    metaRobots: metaContent('robots'),
    metaKeywords: metaContent('keywords'),
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
    language: document.documentElement.lang || '',
    charset: document.characterSet,
    viewport: metaContent('viewport'),
    openGraph,
    twitter,
    links,
    images,
    headings,
    hreflangs,
    jsonLd,
    microdataItemCount: document.querySelectorAll('[itemscope]').length,
    rdfaCount: document.querySelectorAll('[typeof]').length,
    favicon: document.querySelector<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')?.href ?? null,
    appleTouchIcon: document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href ?? null,
    themeColor: metaContent('theme-color'),
    manifest: document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href ?? null,
    doctype,
    metaRefresh: metaContent('refresh'),
    ampHtml: document.querySelector<HTMLLinkElement>('link[rel="amphtml"]')?.href ?? null,
    paginationPrev: document.querySelector<HTMLLinkElement>('link[rel="prev"]')?.href ?? null,
    paginationNext: document.querySelector<HTMLLinkElement>('link[rel="next"]')?.href ?? null,
    scriptCount: document.querySelectorAll('script').length,
    stylesheetCount: document.querySelectorAll('link[rel="stylesheet"]').length,
    inlineStyleBytes,
    iframeCount: document.querySelectorAll('iframe').length,
    embedCount: document.querySelectorAll('embed').length,
    objectCount: document.querySelectorAll('object').length,
    renderBlockingScriptsInHead,
    htmlBytes: document.documentElement.outerHTML.length,
    bodyText,
    wordCount: countWords(bodyText),
    charCount: bodyText.length,
    performance: {
      domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
      loadEvent: nav?.loadEventEnd ?? null,
      ttfb: nav ? nav.responseStart - nav.requestStart : null,
    },
  }
}
