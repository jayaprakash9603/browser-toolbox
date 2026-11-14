import { registrableDomain } from '@/core/protection/domain'

import type { PageAuditInput } from './audit'

export async function fetchDocumentHeaders(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ headers: Record<string, string>; available: boolean }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      credentials: 'omit',
      signal: controller.signal,
    })
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })
    return { headers, available: Object.keys(headers).length > 0 }
  } catch {
    return { headers: {}, available: false }
  } finally {
    clearTimeout(timer)
  }
}

/** Serializable world function for chrome.scripting.executeScript. */
export function collectDomAuditWorld(): {
  mixedContent: string[]
  scripts: string[]
  stylesheets: string[]
  thirdPartyHosts: string[]
  sriMissing: number
} {
  const pageHost = location.hostname.replace(/^www\./, '').toLowerCase()
  const labels = pageHost.split('.')
  const pageSite = labels.length > 2 ? labels.slice(-2).join('.') : pageHost
  const urls = (selector: string, attr: 'href' | 'src'): string[] =>
    [...document.querySelectorAll(selector)]
      .map((node) => (node instanceof Element ? node.getAttribute(attr) : null))
      .filter((value): value is string => Boolean(value))

  const scripts = urls('script[src]', 'src')
  const stylesheets = urls('link[rel~="stylesheet"]', 'href')
  const mixedContent = [...scripts, ...stylesheets, ...urls('img[src]', 'src').slice(0, 80), ...urls('iframe[src]', 'src')]
    .filter((value) => value.startsWith('http://'))
    .slice(0, 40)
  const thirdPartyHosts = [
    ...new Set(
      [...scripts, ...stylesheets]
        .map((value) => {
          try {
            return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
          } catch {
            return ''
          }
        })
        .filter((host) => host && host !== pageHost && !host.endsWith(`.${pageSite}`)),
    ),
  ].slice(0, 40)
  const sriMissing = [...document.querySelectorAll<HTMLScriptElement>('script[src]')].filter((node) => {
    try {
      const host = new URL(node.src).hostname.replace(/^www\./, '').toLowerCase()
      return host !== pageHost && !node.integrity
    } catch {
      return false
    }
  }).length
  return { mixedContent, scripts: scripts.slice(0, 80), stylesheets: stylesheets.slice(0, 40), thirdPartyHosts, sriMissing }
}

export function collectDomAuditFromPage(): Omit<PageAuditInput, 'url' | 'https' | 'headers' | 'headersAvailable'> {
  return collectDomAuditWorld()
}

export function thirdPartyHostsFor(pageHost: string, urls: string[]): string[] {
  const site = registrableDomain(pageHost)
  const hosts = new Set<string>()
  for (const value of urls) {
    try {
      const host = new URL(value).hostname.replace(/^www\./, '').toLowerCase()
      if (host && registrableDomain(host) !== site) hosts.add(host)
    } catch {
      /* ignore */
    }
  }
  return [...hosts]
}
