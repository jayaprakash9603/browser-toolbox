import { domainFromUrl } from './domain'
import type {
  HistoryDomainGroup,
  HistoryPage,
  TimelineDayKey,
  TimelineSection,
  TimeOfDay,
} from './types'

function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfLocalWeek(ts: number): number {
  const d = new Date(ts)
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfLocalMonth(ts: number): number {
  const d = new Date(ts)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function timelineDayKey(lastVisitTime: number, now = Date.now()): TimelineDayKey {
  const todayStart = startOfLocalDay(now)
  const yesterdayStart = todayStart - 86_400_000
  const weekStart = startOfLocalWeek(now)
  const lastWeekStart = weekStart - 7 * 86_400_000
  const monthStart = startOfLocalMonth(now)
  if (lastVisitTime >= todayStart) return 'today'
  if (lastVisitTime >= yesterdayStart) return 'yesterday'
  if (lastVisitTime >= weekStart) return 'earlierThisWeek'
  if (lastVisitTime >= lastWeekStart) return 'lastWeek'
  if (lastVisitTime >= monthStart) return 'earlierThisMonth'
  return 'older'
}

export function timeOfDaySlot(hour: number): TimeOfDay {
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

const DAY_ORDER: TimelineDayKey[] = [
  'today',
  'yesterday',
  'earlierThisWeek',
  'lastWeek',
  'earlierThisMonth',
  'older',
]

const SLOT_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']

export function buildTimelineSections(
  pages: HistoryPage[],
  labels: Record<TimelineDayKey | TimeOfDay, string>,
  now = Date.now(),
): TimelineSection[] {
  const byDay = new Map<TimelineDayKey, Map<TimeOfDay, HistoryPage[]>>()
  for (const page of pages) {
    const day = timelineDayKey(page.lastVisitTime, now)
    const hour = new Date(page.lastVisitTime).getHours()
    const slot = timeOfDaySlot(hour)
    let dayMap = byDay.get(day)
    if (!dayMap) {
      dayMap = new Map()
      byDay.set(day, dayMap)
    }
    const list = dayMap.get(slot) ?? []
    list.push(page)
    dayMap.set(slot, list)
  }
  const sections: TimelineSection[] = []
  for (const day of DAY_ORDER) {
    const dayMap = byDay.get(day)
    if (!dayMap) continue
    const slots = SLOT_ORDER.filter((s) => dayMap.has(s)).map((timeOfDay) => ({
      timeOfDay,
      label: labels[timeOfDay],
      pages: [...(dayMap.get(timeOfDay) ?? [])].sort((a, b) => b.lastVisitTime - a.lastVisitTime),
    }))
    if (slots.length === 0) continue
    sections.push({ key: day, label: labels[day], slots })
  }
  return sections
}

export type DomainSort = 'most' | 'recent' | 'alpha' | 'least'

export function groupByDomain(pages: HistoryPage[], sort: DomainSort): HistoryDomainGroup[] {
  const map = new Map<string, HistoryPage[]>()
  for (const page of pages) {
    const domain = page.domain || domainFromUrl(page.url)
    const list = map.get(domain) ?? []
    list.push(page)
    map.set(domain, list)
  }
  const groups: HistoryDomainGroup[] = [...map.entries()].map(([domain, list]) => {
    const sorted = [...list].sort((a, b) => b.lastVisitTime - a.lastVisitTime)
    const times = sorted.map((p) => p.lastVisitTime)
    const totalVisits = sorted.reduce((n, p) => n + p.visitCount, 0)
    return {
      domain,
      pages: sorted,
      totalVisits,
      uniquePages: sorted.length,
      lastVisitTime: Math.max(...times),
      firstVisitTime: Math.min(...times),
    }
  })
  switch (sort) {
    case 'alpha':
      groups.sort((a, b) => a.domain.localeCompare(b.domain))
      break
    case 'least':
      groups.sort((a, b) => a.totalVisits - b.totalVisits || a.domain.localeCompare(b.domain))
      break
    case 'recent':
      groups.sort((a, b) => b.lastVisitTime - a.lastVisitTime)
      break
  default:
      groups.sort((a, b) => b.totalVisits - a.totalVisits || b.lastVisitTime - a.lastVisitTime)
  }
  return groups
}
