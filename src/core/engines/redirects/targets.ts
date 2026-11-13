import { stripHash } from '@/core/engines/linkChecker/report'
import type { PageLink, PageLinksSnapshot } from '@/core/engines/links/pageLinks'

import type { RedirectTarget } from './chain'

export const MAX_REDIRECT_TARGETS = 150
export const REDIRECT_CONCURRENCY = 6
export const REDIRECT_TIMEOUT_MS = 10_000

export function pageRedirectTarget(snapshot: Pick<PageLinksSnapshot, 'url' | 'title' | 'host'>): RedirectTarget {
  return {
    url: stripHash(snapshot.url),
    text: snapshot.title || snapshot.host || snapshot.url,
    kind: 'internal',
    host: snapshot.host,
    source: 'page',
    occurrences: [],
  }
}

export function manualRedirectTarget(raw: string): RedirectTarget | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.hash = ''
    return {
      url: url.href,
      text: url.hostname.replace(/^www\./, ''),
      kind: 'other',
      host: url.hostname.replace(/^www\./, ''),
      source: 'manual',
      occurrences: [],
    }
  } catch {
    return null
  }
}

export function collectRedirectTargets(snapshot: PageLinksSnapshot): RedirectTarget[] {
  const http = snapshot.links.filter((link) => link.kind === 'internal' || link.kind === 'external')
  const pageKey = stripHash(snapshot.url)
  const grouped = new Map<string, PageLink[]>()
  for (const link of http) {
    const url = stripHash(link.href)
    if (url === pageKey) continue
    const list = grouped.get(url)
    if (list) list.push(link)
    else grouped.set(url, [link])
  }
  const targets: RedirectTarget[] = []
  for (const occurrences of grouped.values()) {
    targets.push(toTarget(occurrences[0], occurrences))
    if (targets.length >= MAX_REDIRECT_TARGETS) break
  }
  return targets
}

function toTarget(link: PageLink, occurrences: PageLink[]): RedirectTarget {
  return {
    url: stripHash(link.href),
    text: link.text,
    kind: link.kind === 'external' ? 'external' : 'internal',
    host: link.host,
    source: 'link',
    occurrences: occurrences.map((item) => ({ index: item.index, href: item.href, visible: item.visible })),
  }
}
