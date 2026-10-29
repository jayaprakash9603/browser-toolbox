import type { PageFacts, PageSignals } from '@/core/engines/techStack/types'

export interface DomScan {
  signals: Omit<PageSignals, 'url' | 'jsValues'>
  facts: PageFacts
}

/**
 * Runs in the page's isolated world through chrome.scripting.executeScript, which serializes only
 * this function, so everything it needs has to be declared inside it.
 */
export async function collectDomSignals(selectors: string[]): Promise<DomScan> {
  const MAX_RESOURCES = 600
  const MAX_INLINE_CHARS = 60_000
  const MAX_HTML_CHARS = 200_000
  const HEADER_TIMEOUT_MS = 4000
  const NETWORKS: [string, RegExp][] = [
    ['Facebook', /(?:^|\.)facebook\.com$/],
    ['X', /(?:^|\.)(?:twitter|x)\.com$/],
    ['LinkedIn', /(?:^|\.)linkedin\.com$/],
    ['Instagram', /(?:^|\.)instagram\.com$/],
    ['YouTube', /(?:^|\.)(?:youtube\.com|youtu\.be)$/],
    ['GitHub', /(?:^|\.)github\.com$/],
    ['TikTok', /(?:^|\.)tiktok\.com$/],
    ['Pinterest', /(?:^|\.)pinterest\.com$/],
    ['Reddit', /(?:^|\.)reddit\.com$/],
    ['Telegram', /^t\.me$/],
    ['Discord', /(?:^|\.)discord\.(?:gg|com)$/],
    ['WhatsApp', /^(?:wa\.me|(?:www\.)?whatsapp\.com)$/],
  ]

  const unique = <T,>(values: T[], limit: number): T[] => [...new Set(values)].slice(0, limit)
  const attr = (selector: string, name: string): string =>
    document.querySelector(selector)?.getAttribute(name)?.trim() ?? ''

  const readHeaders = async (): Promise<Record<string, string>> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEADER_TIMEOUT_MS)
    const headers: Record<string, string> = {}
    try {
      const response = await fetch(location.href, {
        cache: 'force-cache',
        credentials: 'same-origin',
        signal: controller.signal,
      })
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value
      })
      controller.abort()
    } catch {
      /* some pages cannot be refetched; the other signals still work */
    }
    clearTimeout(timer)
    return headers
  }

  const urls = (selector: string, property: 'href' | 'src'): string[] =>
    [...document.querySelectorAll<HTMLElement>(selector)]
      .map((node) => (node as HTMLLinkElement & HTMLIFrameElement)[property])
      .filter(Boolean)

  const meta: Record<string, string> = {}
  for (const tag of document.querySelectorAll<HTMLMetaElement>('meta[name],meta[property]')) {
    const key = (tag.getAttribute('name') ?? tag.getAttribute('property') ?? '').toLowerCase()
    if (key && !(key in meta)) meta[key] = tag.content
  }

  const scripts = urls('script[src]', 'src').slice(0, MAX_RESOURCES)
  const inlineScripts = [...document.querySelectorAll('script:not([src])')]
    .map((node) => (node.textContent ?? '').slice(0, 2000))
    .join('\n')
    .slice(0, MAX_INLINE_CHARS)
  const resources = [
    ...urls('link[rel~="stylesheet"],link[rel="preload"],link[rel="modulepreload"],link[rel="prefetch"],link[rel="preconnect"],link[rel="dns-prefetch"]', 'href'),
    ...urls('iframe[src]', 'src'),
    ...urls('img[src]', 'src').slice(0, 200),
  ].slice(0, MAX_RESOURCES)

  const domMatches = selectors.filter((selector) => {
    try {
      return document.querySelector(selector) !== null
    } catch {
      return false
    }
  })
  const bodyRoot = document.querySelector('body > div')
  if (bodyRoot && '_reactRootContainer' in bodyRoot) domMatches.push('body > div._reactRootContainer')

  const social: { network: string; url: string }[] = []
  const seenSocial = new Set<string>()
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')) {
    if (social.length >= 12) break
    let url: URL
    try {
      url = new URL(anchor.href)
    } catch {
      continue
    }
    const network = NETWORKS.find(([, host]) => host.test(url.hostname))?.[0]
    if (!network || url.pathname.length <= 1 || /share|intent|sharer/i.test(url.href)) continue
    const key = `${network}|${url.origin}${url.pathname}`
    if (seenSocial.has(key)) continue
    seenSocial.add(key)
    social.push({ network, url: `${url.origin}${url.pathname}`.replace(/\/$/, '') })
  }

  const decode = (value: string): string => {
    try {
      return decodeURIComponent(value).trim()
    } catch {
      return value.trim()
    }
  }
  const hrefValues = (prefix: string): string[] =>
    unique(
      [...document.querySelectorAll<HTMLAnchorElement>(`a[href^="${prefix}"]`)].map((a) =>
        decode(a.getAttribute('href')!.slice(prefix.length).split('?')[0]),
      ),
      8,
    ).filter(Boolean)

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined

  const styleText = [...document.querySelectorAll('style')]
    .map((node) => node.textContent ?? '')
    .join('\n')
    .slice(0, 40_000)
  const htmlBlob = styleText ? `${styleText}\n${document.documentElement.outerHTML}` : document.documentElement.outerHTML

  return {
    signals: {
      scripts,
      resources,
      inlineScripts,
      meta,
      headers: await readHeaders(),
      cookies: document.cookie.split(';').map((cookie) => cookie.split('=')[0].trim()).filter(Boolean),
      domMatches,
      html: htmlBlob.slice(0, MAX_HTML_CHARS),
      protocol: navigation?.nextHopProtocol,
    },
    facts: {
      title: document.title.trim(),
      description: meta.description ?? meta['og:description'] ?? '',
      language: document.documentElement.lang,
      charset: document.characterSet,
      canonical: attr('link[rel="canonical"]', 'href'),
      generator: meta.generator ?? '',
      social,
      emails: hrefValues('mailto:'),
      phones: hrefValues('tel:'),
      feeds: unique(
        urls('link[type="application/rss+xml"],link[type="application/atom+xml"]', 'href').filter((href) =>
          /^https?:/i.test(href),
        ),
        6,
      ),
      counts: {
        scripts: document.scripts.length,
        stylesheets: document.querySelectorAll('link[rel~="stylesheet"],style').length,
        images: document.images.length,
        links: document.links.length,
        forms: document.forms.length,
        iframes: document.querySelectorAll('iframe').length,
      },
    },
  }
}

/** Runs in the page's own world, the only place framework globals such as `React` are visible. */
export function collectJsValues(paths: string[]): Record<string, string> {
  const found: Record<string, string> = {}
  let globalKeys: string[] | null = null

  for (const path of paths) {
    if (path.endsWith('*')) {
      globalKeys ??= Object.keys(window)
      const prefix = path.slice(0, -1)
      if (globalKeys.some((key) => key.startsWith(prefix))) found[path] = ''
      continue
    }
    try {
      let value: unknown = window
      for (const part of path.split('.')) {
        if (value === null || value === undefined) break
        value = (value as Record<string, unknown>)[part]
      }
      if (value === null || value === undefined) continue
      found[path] = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
    } catch {
      /* a getter on the page threw; treat the path as absent */
    }
  }

  type DevtoolsRenderer = { version?: string }
  type DevtoolsHook = { renderers?: Map<number, DevtoolsRenderer> }
  const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevtoolsHook }).__REACT_DEVTOOLS_GLOBAL_HOOK__
  if (hook?.renderers && hook.renderers.size > 0) {
    found.__REACT_DEVTOOLS_GLOBAL_HOOK__ ??= ''
    if (!found['React.version']) {
      for (const renderer of hook.renderers.values()) {
        if (renderer?.version) {
          found['React.version'] = String(renderer.version)
          break
        }
      }
    }
  }

  return found
}
