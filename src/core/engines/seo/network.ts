import { parseRobotsTxt, robotsAllowsUrl } from './robots'
import { isSitemapIndex, parseSitemapLocs, sitemapContainsUrl } from './sitemap'
import type { SeoNetworkContext } from './types'

const FETCH_TIMEOUT_MS = 12_000

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal, credentials: 'omit' })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function fetchWithRedirects(url: string): Promise<{
  statusCode: number
  finalUrl: string
  redirectCount: number
  headers: Headers
}> {
  let current = url
  let redirectCount = 0
  for (let i = 0; i < 8; i += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      credentials: 'omit',
    })
    clearTimeout(timer)
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) break
      current = new URL(loc, current).href
      redirectCount += 1
      continue
    }
    return { statusCode: res.status, finalUrl: current, redirectCount, headers: res.headers }
  }
  return { statusCode: 0, finalUrl: current, redirectCount, headers: new Headers() }
}

async function resolveSitemapForUrl(origin: string, pageUrl: string): Promise<string | null> {
  const robotsUrl = `${origin}/robots.txt`
  const robots = await fetchText(robotsUrl)
  const candidates: string[] = []
  if (robots) {
    candidates.push(...parseRobotsTxt(robots).sitemaps)
  }
  candidates.push(`${origin}/sitemap.xml`)

  for (const smUrl of candidates) {
    const xml = await fetchText(smUrl)
    if (!xml) continue
    if (isSitemapIndex(xml)) {
      const child = parseSitemapLocs(xml)[0]
      if (child) {
        const childXml = await fetchText(child)
        if (childXml && sitemapContainsUrl(childXml, pageUrl)) return childXml
      }
      continue
    }
    if (sitemapContainsUrl(xml, pageUrl)) return xml
  }
  return null
}

export async function fetchSeoNetworkContext(pageUrl: string): Promise<SeoNetworkContext> {
  let origin = ''
  try {
    origin = new URL(pageUrl).origin
  } catch {
    return emptyNetwork(pageUrl)
  }

  const [pageRes, robotsTxt, llmsTxt] = await Promise.all([
    fetchWithRedirects(pageUrl),
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
  ])

  const robotsAllows = robotsAllowsUrl(robotsTxt, pageUrl)
  const robotsSitemaps = robotsTxt ? parseRobotsTxt(robotsTxt).sitemaps : []
  const sitemapXml = await resolveSitemapForUrl(origin, pageUrl)
  const inSitemap = sitemapXml ? sitemapContainsUrl(sitemapXml, pageUrl) : null

  return {
    statusCode: pageRes.statusCode || null,
    finalUrl: pageRes.finalUrl,
    redirectCount: pageRes.redirectCount,
    xRobotsTag: pageRes.headers.get('x-robots-tag'),
    contentType: pageRes.headers.get('content-type'),
    contentLength: Number(pageRes.headers.get('content-length')) || null,
    contentEncoding: pageRes.headers.get('content-encoding'),
    cacheControl: pageRes.headers.get('cache-control'),
    robotsTxt,
    robotsAllowsUrl: robotsAllows,
    robotsSitemaps,
    sitemapContainsUrl: inSitemap,
    llmsTxt,
  }
}

function emptyNetwork(pageUrl: string): SeoNetworkContext {
  return {
    statusCode: null,
    finalUrl: pageUrl,
    redirectCount: 0,
    xRobotsTag: null,
    contentType: null,
    contentLength: null,
    contentEncoding: null,
    cacheControl: null,
    robotsTxt: null,
    robotsAllowsUrl: null,
    robotsSitemaps: [],
    sitemapContainsUrl: null,
    llmsTxt: null,
  }
}
