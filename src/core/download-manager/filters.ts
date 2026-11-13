import { bytesReceived, startTimeMs, totalBytes } from './bytes'
import { classifyFile, extensionFromPath } from './classify'
import { hostFromUrl } from './urls'
import { mapChromeDownloadStatus } from './status'
import type { DownloadUiStatus, FileCategory } from './types'

export type StatusFilter = 'all' | DownloadUiStatus

export type SortKey = 'latest' | 'oldest' | 'name' | 'size' | 'progress' | 'site' | 'status'

export interface DownloadListFilters {
  query: string
  status: StatusFilter
  category: FileCategory | 'all'
  dateFrom?: number
  dateTo?: number
  minSize?: number
  maxSize?: number
  mime?: string
  sort: SortKey
}

export function defaultFilters(): DownloadListFilters {
  return { query: '', status: 'all', category: 'all', sort: 'latest' }
}

function matchesQuery(item: chrome.downloads.DownloadItem, q: string): boolean {
  const query = q.trim().toLowerCase()
  if (!query) return true
  const name = (item.filename || '').toLowerCase()
  const url = (item.finalUrl || item.url || '').toLowerCase()
  const ext = extensionFromPath(item.filename || item.url)
  const host = hostFromUrl(item.referrer || item.url).toLowerCase()
  const mime = (item.mime || '').toLowerCase()
  return (
    name.includes(query) ||
    url.includes(query) ||
    ext.includes(query) ||
    host.includes(query) ||
    mime.includes(query)
  )
}

export function filterDownloads(items: chrome.downloads.DownloadItem[], filters: DownloadListFilters): chrome.downloads.DownloadItem[] {
  let list = items.filter((item) => matchesQuery(item, filters.query))
  if (filters.status !== 'all') {
    list = list.filter((item) => mapChromeDownloadStatus(item) === filters.status)
  }
  if (filters.category !== 'all') {
    list = list.filter((item) => classifyFile(item.mime, item.filename || item.url) === filters.category)
  }
  if (filters.mime?.trim()) {
    const m = filters.mime.trim().toLowerCase()
    list = list.filter((item) => (item.mime || '').toLowerCase().includes(m))
  }
  if (filters.dateFrom != null) {
    list = list.filter((item) => startTimeMs(item) >= filters.dateFrom!)
  }
  if (filters.dateTo != null) {
    list = list.filter((item) => startTimeMs(item) <= filters.dateTo!)
  }
  if (filters.minSize != null) {
    list = list.filter((item) => (totalBytes(item) ?? bytesReceived(item)) >= filters.minSize!)
  }
  if (filters.maxSize != null) {
    list = list.filter((item) => (totalBytes(item) ?? bytesReceived(item)) <= filters.maxSize!)
  }
  return sortDownloads(list, filters.sort)
}

export function sortDownloads(items: chrome.downloads.DownloadItem[], sort: SortKey): chrome.downloads.DownloadItem[] {
  const copy = [...items]
  copy.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return startTimeMs(a) - startTimeMs(b)
      case 'name': {
        const an = (a.filename || '').toLowerCase()
        const bn = (b.filename || '').toLowerCase()
        return an.localeCompare(bn)
      }
      case 'size':
        return (totalBytes(b) ?? bytesReceived(b)) - (totalBytes(a) ?? bytesReceived(a))
      case 'progress': {
        const at = totalBytes(a)
        const bt = totalBytes(b)
        const ap = at ? bytesReceived(a) / at : 0
        const bp = bt ? bytesReceived(b) / bt : 0
        return bp - ap
      }
      case 'site':
        return hostFromUrl(a.referrer || a.url).localeCompare(hostFromUrl(b.referrer || b.url))
      case 'status':
        return mapChromeDownloadStatus(a).localeCompare(mapChromeDownloadStatus(b))
      case 'latest':
      default:
        return startTimeMs(b) - startTimeMs(a)
    }
  })
  return copy
}
