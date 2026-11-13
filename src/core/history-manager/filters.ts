import { matchesContentType } from './classify'
import { domainFromUrl } from './domain'
import type { HistoryFilters, HistoryPage } from './types'

export function defaultHistoryFilters(query = ''): HistoryFilters {
  return {
    query,
    range: '7d',
    domains: [],
    visitActivity: 'all',
    contentType: 'all',
  }
}

function matchesQuery(page: HistoryPage, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    page.title.toLowerCase().includes(q) ||
    page.url.toLowerCase().includes(q) ||
    page.domain.toLowerCase().includes(q)
  )
}

function matchesActivity(page: HistoryPage, activity: HistoryFilters['visitActivity']): boolean {
  switch (activity) {
    case 'most':
    case 'frequent':
      return page.visitCount > 1
    case 'single':
      return page.visitCount <= 1
    case 'recent':
      return true
    default:
      return true
  }
}

export function applyHistoryFilters(pages: HistoryPage[], filters: HistoryFilters): HistoryPage[] {
  let list = pages.filter(
    (p) =>
      matchesQuery(p, filters.query) &&
      matchesActivity(p, filters.visitActivity) &&
      matchesContentType(p.url, filters.contentType),
  )
  if (filters.domains.length > 0) {
    const set = new Set(filters.domains.map((d) => d.toLowerCase()))
    list = list.filter((p) => set.has(p.domain.toLowerCase()))
  }
  return list
}

export function sortByMostVisited(pages: HistoryPage[]): HistoryPage[] {
  return [...pages].sort((a, b) => b.visitCount - a.visitCount || b.lastVisitTime - a.lastVisitTime)
}

export function sortByRecent(pages: HistoryPage[]): HistoryPage[] {
  return [...pages].sort((a, b) => b.lastVisitTime - a.lastVisitTime)
}

export function topDomainsFromPages(pages: HistoryPage[], limit: number): { domain: string; visits: number }[] {
  const map = new Map<string, number>()
  for (const p of pages) {
    map.set(p.domain, (map.get(p.domain) ?? 0) + p.visitCount)
  }
  return [...map.entries()]
    .map(([domain, visits]) => ({ domain, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit)
}

export function distinctDomains(pages: HistoryPage[]): string[] {
  const set = new Set<string>()
  pages.forEach((p) => {
    const d = domainFromUrl(p.url) || p.domain
    if (d) set.add(d)
  })
  return [...set].sort((a, b) => a.localeCompare(b))
}
