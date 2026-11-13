import { describe, expect, it } from 'vitest'

import {
  applyHistoryFilters,
  contentTypeFromUrl,
  defaultHistoryFilters,
  deriveHistoryStats,
  domainFromUrl,
  groupByDomain,
  historyToCsv,
  historyToJson,
  mapHistoryItem,
  type HistoryPage,
} from '@/core/history-manager'

const samplePages: HistoryPage[] = [
  {
    id: '1',
    url: 'https://example.com/docs/guide.pdf',
    title: 'Guide',
    domain: 'example.com',
    lastVisitTime: Date.now(),
    visitCount: 3,
    typedCount: 0,
  },
  {
    id: '2',
    url: 'https://news.example.org/article',
    title: 'Article',
    domain: 'news.example.org',
    lastVisitTime: Date.now() - 86_400_000,
    visitCount: 1,
    typedCount: 1,
  },
]

describe('history-manager core', () => {
  it('parses domain from url', () => {
    expect(domainFromUrl('https://www.google.com/search')).toBe('google.com')
  })

  it('classifies pdf urls', () => {
    expect(contentTypeFromUrl(samplePages[0]!.url)).toBe('pdf')
  })

  it('filters by content type and query', () => {
    const filters = { ...defaultHistoryFilters('guide'), contentType: 'pdf' as const }
    const result = applyHistoryFilters(samplePages, filters)
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('Guide')
  })

  it('derives stats', () => {
    const stats = deriveHistoryStats(samplePages)
    expect(stats.totalPages).toBe(2)
    expect(stats.uniqueDomains).toBe(2)
  })

  it('groups by domain', () => {
    const groups = groupByDomain(samplePages, 'most')
    expect(groups).toHaveLength(2)
    expect(groups[0]?.totalVisits).toBeGreaterThanOrEqual(groups[1]?.totalVisits ?? 0)
  })

  it('exports csv and json', () => {
    const csv = historyToCsv(samplePages)
    expect(csv.split('\n')).toHaveLength(3)
    const json = JSON.parse(historyToJson(samplePages)) as unknown[]
    expect(json).toHaveLength(2)
  })

  it('maps chrome history items', () => {
    const page = mapHistoryItem({
      id: '42',
      url: 'https://a.test',
      title: 'A',
      lastVisitTime: 1,
      visitCount: 2,
    })
    expect(page?.domain).toBe('a.test')
  })
})
