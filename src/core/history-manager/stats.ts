import { domainFromUrl } from './domain'
import type { HistoryPage, HistoryStats } from './types'

function countInWindow(pages: HistoryPage[], start: number, end: number): number {
  return pages.filter((p) => p.lastVisitTime >= start && p.lastVisitTime <= end).length
}

export function deriveHistoryStats(pages: HistoryPage[], now = Date.now()): HistoryStats {
  const day = 86_400_000
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const today0 = todayStart.getTime()
  const yesterday0 = today0 - day
  const weekStart = today0 - 6 * day

  const domainVisits = new Map<string, number>()
  const hourBuckets = new Array(24).fill(0) as number[]
  for (const p of pages) {
    const d = p.domain || domainFromUrl(p.url)
    domainVisits.set(d, (domainVisits.get(d) ?? 0) + p.visitCount)
    hourBuckets[new Date(p.lastVisitTime).getHours()] += 1
  }
  let topDomain: string | null = null
  let topDomainVisits = 0
  for (const [domain, visits] of domainVisits) {
    if (visits > topDomainVisits) {
      topDomain = domain
      topDomainVisits = visits
    }
  }
  let peakHour: number | null = null
  let peakHourCount = 0
  hourBuckets.forEach((count, hour) => {
    if (count > peakHourCount) {
      peakHour = hour
      peakHourCount = count
    }
  })

  return {
    totalPages: pages.length,
    uniqueDomains: domainVisits.size,
    todayVisits: countInWindow(pages, today0, now),
    yesterdayVisits: countInWindow(pages, yesterday0, today0),
    weekVisits: countInWindow(pages, weekStart, now),
    topDomain,
    topDomainVisits,
    peakHour,
    peakHourCount,
  }
}

export function visitsByDay(pages: HistoryPage[], days: number, now = Date.now()): { key: string; count: number; start: number }[] {
  const out: { key: string; count: number; start: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const start = startOfDay(now - i * 86_400_000)
    const end = start + 86_400_000
    const label = formatDayKey(start)
    out.push({
      key: label,
      start,
      count: pages.filter((p) => p.lastVisitTime >= start && p.lastVisitTime < end).length,
    })
  }
  return out
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function formatDayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function visitsByWeekday(pages: HistoryPage[]): { day: number; label: string; count: number }[] {
  const buckets = Array.from({ length: 7 }, (_, day) => ({ day, label: weekdayLabel(day), count: 0 }))
  for (const p of pages) {
    const idx = new Date(p.lastVisitTime).getDay()
    buckets[idx].count += 1
  }
  return buckets
}

function weekdayLabel(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? ''
}

export function visitsByHour(pages: HistoryPage[]): number[] {
  const buckets = new Array(24).fill(0) as number[]
  pages.forEach((p) => {
    buckets[new Date(p.lastVisitTime).getHours()] += 1
  })
  return buckets
}
