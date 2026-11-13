import { domainFromUrl } from './domain'
import type { HistoryPage, HistoryVisit } from './types'

export function mapHistoryItem(item: chrome.history.HistoryItem): HistoryPage | null {
  if (!item.url) return null
  return {
    id: item.id ?? item.url,
    url: item.url,
    title: item.title?.trim() || item.url,
    domain: domainFromUrl(item.url),
    lastVisitTime: item.lastVisitTime ?? 0,
    visitCount: item.visitCount ?? 1,
    typedCount: item.typedCount ?? 0,
  }
}

export function mapVisitItem(item: chrome.history.VisitItem): HistoryVisit {
  return {
    visitId: item.visitId,
    visitTime: item.visitTime ?? 0,
    transition: item.transition,
  }
}

export function dedupePagesByUrl(pages: HistoryPage[]): HistoryPage[] {
  const map = new Map<string, HistoryPage>()
  for (const page of pages) {
    const existing = map.get(page.url)
    if (!existing || page.lastVisitTime > existing.lastVisitTime) {
      map.set(page.url, page)
    }
  }
  return [...map.values()]
}
