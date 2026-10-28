import { isDown } from './constants'
import type { BucketStats, LatencyGrade, NetEvent, NetSample, NetStatus, WindowStats } from './types'

export interface NetInterval {
  start: number
  end: number
  status: NetStatus
}

const DAY_MS = 86_400_000
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function sortEvents(events: NetEvent[]): NetEvent[] {
  return [...events].sort((a, b) => a.at - b.at)
}

/** Each event lasts until the next one; the latest lasts until `now`. */
export function toIntervals(events: NetEvent[], now: number): NetInterval[] {
  const sorted = sortEvents(events)
  const out: NetInterval[] = []
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].at
    const end = Math.min(now, sorted[i + 1]?.at ?? now)
    if (end > start) out.push({ start, end, status: sorted[i].status })
  }
  return out
}

/** A disconnect is a drop from online into offline/LAN-only; "No data" gaps in between are skipped. */
function disconnectStarts(intervals: NetInterval[]): number[] {
  const starts: number[] = []
  let previous: NetStatus | null = null
  for (const interval of intervals) {
    if (interval.status === 'nodata') continue
    if (isDown(interval.status) && previous === 'online') starts.push(interval.start)
    previous = interval.status
  }
  return starts
}

function finish(onlineMs: number, downtimeMs: number, disconnects: number): WindowStats {
  const total = onlineMs + downtimeMs
  return { onlineMs, downtimeMs, disconnects, availability: total > 0 ? onlineMs / total : null }
}

export function statsForWindow(intervals: NetInterval[], from: number, to: number): WindowStats {
  let onlineMs = 0
  let downtimeMs = 0
  for (const interval of intervals) {
    const overlap = Math.min(interval.end, to) - Math.max(interval.start, from)
    if (overlap <= 0) continue
    if (interval.status === 'online') onlineMs += overlap
    else if (isDown(interval.status)) downtimeMs += overlap
  }
  const disconnects = disconnectStarts(intervals).filter((t) => t >= from && t < to).length
  return finish(onlineMs, downtimeMs, disconnects)
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export type GeneralStatsKey = 'today' | 'week' | 'month' | 'all'

export function generalStats(events: NetEvent[], now: number): Record<GeneralStatsKey, WindowStats> {
  const intervals = toIntervals(events, now)
  return {
    today: statsForWindow(intervals, startOfDay(now), now + 1),
    week: statsForWindow(intervals, now - 7 * DAY_MS, now + 1),
    month: statsForWindow(intervals, now - 30 * DAY_MS, now + 1),
    all: statsForWindow(intervals, -Infinity, now + 1),
  }
}

export function dailyStats(events: NetEvent[], now: number, days = 30): BucketStats[] {
  const intervals = toIntervals(events, now)
  const today = startOfDay(now)
  const out: BucketStats[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const start = addDays(today, -offset)
    const end = Math.min(addDays(start, 1), now + 1)
    const d = new Date(start)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      ...statsForWindow(intervals, start, end),
    })
  }
  return out
}

type Acc = { online: number; down: number; disconnects: number }

/** Splits monitored time at local hour boundaries into hour-of-day and weekday buckets. */
function accumulateByClock(events: NetEvent[], now: number): { hours: Acc[]; weekdays: Acc[] } {
  const hours = Array.from({ length: 24 }, () => ({ online: 0, down: 0, disconnects: 0 }))
  const weekdays = Array.from({ length: 7 }, () => ({ online: 0, down: 0, disconnects: 0 }))
  const intervals = toIntervals(events, now)
  for (const interval of intervals) {
    if (interval.status === 'nodata') continue
    let t = interval.start
    while (t < interval.end) {
      const d = new Date(t)
      const next = new Date(t)
      next.setMinutes(0, 0, 0)
      next.setHours(d.getHours() + 1)
      const segEnd = Math.min(next.getTime(), interval.end)
      const key = interval.status === 'online' ? 'online' : 'down'
      hours[d.getHours()][key] += segEnd - t
      weekdays[d.getDay()][key] += segEnd - t
      t = segEnd
    }
  }
  for (const start of disconnectStarts(intervals)) {
    const d = new Date(start)
    hours[d.getHours()].disconnects++
    weekdays[d.getDay()].disconnects++
  }
  return { hours, weekdays }
}

function hourLabel(hour: number): string {
  const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 || h === 24 ? 'AM' : 'PM'}`
  return `${fmt(hour)}-${fmt(hour + 1)}`
}

export function weekdayStats(events: NetEvent[], now: number): BucketStats[] {
  return accumulateByClock(events, now).weekdays.map((a, i) => ({
    key: String(i),
    label: WEEKDAYS[i],
    ...finish(a.online, a.down, a.disconnects),
  }))
}

export function hourStats(events: NetEvent[], now: number): BucketStats[] {
  return accumulateByClock(events, now).hours.map((a, i) => ({
    key: String(i),
    label: hourLabel(i),
    ...finish(a.online, a.down, a.disconnects),
  }))
}

const SEVERITY: Record<NetStatus, number> = { online: 0, nodata: 1, lan: 2, offline: 3 }

export interface RealtimePoint {
  at: number
  latency: number | null
  status: NetStatus
}

/** Buckets samples so a 24 h window at 1 s stays chartable; each bucket keeps its worst status. */
export function downsampleSamples(samples: NetSample[], from: number, to: number, maxPoints = 480): RealtimePoint[] {
  const inRange = samples.filter((s) => s.at >= from && s.at <= to)
  if (inRange.length <= maxPoints) return inRange.map(({ at, latency, status }) => ({ at, latency, status }))
  const size = (to - from) / maxPoints
  const out: RealtimePoint[] = []
  let bucket = -1
  let sum = 0
  let count = 0
  let current: RealtimePoint | null = null
  const flush = () => {
    if (!current) return
    current.latency = count ? sum / count : null
    out.push(current)
  }
  for (const s of inRange) {
    const b = Math.floor((s.at - from) / size)
    if (b !== bucket) {
      flush()
      bucket = b
      sum = 0
      count = 0
      current = { at: s.at, latency: null, status: s.status }
    }
    if (s.latency !== null) {
      sum += s.latency
      count++
    }
    if (SEVERITY[s.status] > SEVERITY[current!.status]) current!.status = s.status
  }
  flush()
  return out
}

export interface StatusSegment {
  start: number
  end: number
  status: NetStatus
}

/** Contiguous runs of non-online points, used to shade outages on the realtime chart. */
export function outageSegments(points: RealtimePoint[], until: number): StatusSegment[] {
  const out: StatusSegment[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p.status === 'online') continue
    const end = points[i + 1]?.at ?? until
    const last = out.at(-1)
    if (last && last.status === p.status && last.end === p.at) last.end = end
    else out.push({ start: p.at, end, status: p.status })
  }
  return out
}

export function latencySummary(points: { latency: number | null }[]) {
  let sum = 0
  let count = 0
  let min = Infinity
  let max = -Infinity
  for (const { latency } of points) {
    if (latency === null) continue
    sum += latency
    count++
    if (latency < min) min = latency
    if (latency > max) max = latency
  }
  if (!count) return { avg: null, min: null, max: null }
  return { avg: sum / count, min, max }
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null
  const index = (sorted.length - 1) * p
  const lo = Math.floor(index)
  const hi = Math.ceil(index)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo)
}

export interface LatencyHealth {
  avg: number | null
  min: number | null
  max: number | null
  p50: number | null
  p95: number | null
  p99: number | null
  jitter: number | null
  failed: number
  probes: number
  failureRate: number | null
}

/** Percentiles, jitter (mean consecutive delta) and failed-probe rate for a sample window. */
export function latencyHealth(samples: { latency: number | null; status?: NetStatus }[]): LatencyHealth {
  const values: number[] = []
  let failed = 0
  let probes = 0
  let jitterSum = 0
  let jitterCount = 0
  let previous: number | null = null
  for (const sample of samples) {
    if (sample.status === 'nodata') continue
    probes++
    if (sample.latency === null) {
      failed++
      previous = null
      continue
    }
    values.push(sample.latency)
    if (previous !== null) {
      jitterSum += Math.abs(sample.latency - previous)
      jitterCount++
    }
    previous = sample.latency
  }
  const sorted = [...values].sort((a, b) => a - b)
  const summary = latencySummary(samples)
  return {
    ...summary,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    jitter: jitterCount ? jitterSum / jitterCount : null,
    failed,
    probes,
    failureRate: probes > 0 ? failed / probes : null,
  }
}

export function latencyGrade(avgMs: number | null): LatencyGrade {
  if (avgMs === null) return 'unknown'
  if (avgMs < 50) return 'excellent'
  if (avgMs < 100) return 'good'
  if (avgMs < 200) return 'fair'
  return 'poor'
}

export type StatusMix = Record<NetStatus, number>

export function statusMix(events: NetEvent[], now: number, from = -Infinity): StatusMix {
  const mix: StatusMix = { online: 0, lan: 0, offline: 0, nodata: 0 }
  for (const interval of toIntervals(events, now)) {
    const overlap = Math.min(interval.end, now + 1) - Math.max(interval.start, from)
    if (overlap > 0) mix[interval.status] += overlap
  }
  return mix
}

export interface NetIncident {
  start: number
  end: number
  durationMs: number
  status: NetStatus
}

/** Down periods (offline/LAN), newest first. Adjacent downs of the same status merge. */
export function incidents(events: NetEvent[], now: number): NetIncident[] {
  const out: NetIncident[] = []
  for (const interval of toIntervals(events, now)) {
    if (!isDown(interval.status)) continue
    const last = out.at(-1)
    if (last && last.status === interval.status && last.end === interval.start) {
      last.end = interval.end
      last.durationMs = last.end - last.start
      continue
    }
    out.push({
      start: interval.start,
      end: interval.end,
      durationMs: interval.end - interval.start,
      status: interval.status,
    })
  }
  return out.reverse()
}

export function longestIncident(list: NetIncident[]): NetIncident | null {
  let best: NetIncident | null = null
  for (const item of list) {
    if (!best || item.durationMs > best.durationMs) best = item
  }
  return best
}

export function currentStreak(events: NetEvent[], now: number): { status: NetStatus; durationMs: number } | null {
  const last = toIntervals(events, now).at(-1)
  if (!last) return null
  return { status: last.status, durationMs: last.end - last.start }
}

export interface HistogramBin {
  from: number
  to: number
  count: number
}

/** Equal-width latency bins; empty when nothing was measured. */
export function latencyHistogram(samples: { latency: number | null }[], binCount = 12): HistogramBin[] {
  const values = samples.map((s) => s.latency).filter((v): v is number => v !== null)
  if (!values.length) return []
  const max = Math.max(...values, 1)
  const width = Math.max(5, Math.ceil(max / binCount / 5) * 5)
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    from: i * width,
    to: (i + 1) * width,
    count: 0,
  }))
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.floor(value / width))
    bins[index].count++
  }
  while (bins.length > 1 && bins.at(-1)!.count === 0) bins.pop()
  return bins
}

export interface HeatCell {
  weekday: number
  hour: number
  onlineMs: number
  downMs: number
  availability: number | null
}

/** 7×24 availability grid in local time (Sun=0). */
export function hourHeatmap(events: NetEvent[], now: number): HeatCell[] {
  const cells: HeatCell[] = []
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ weekday, hour, onlineMs: 0, downMs: 0, availability: null })
    }
  }
  for (const interval of toIntervals(events, now)) {
    if (interval.status === 'nodata') continue
    let t = interval.start
    while (t < interval.end) {
      const d = new Date(t)
      const next = new Date(t)
      next.setMinutes(0, 0, 0)
      next.setHours(d.getHours() + 1)
      const segEnd = Math.min(next.getTime(), interval.end)
      const cell = cells[d.getDay() * 24 + d.getHours()]
      if (interval.status === 'online') cell.onlineMs += segEnd - t
      else cell.downMs += segEnd - t
      t = segEnd
    }
  }
  for (const cell of cells) {
    const total = cell.onlineMs + cell.downMs
    cell.availability = total > 0 ? cell.onlineMs / total : null
  }
  return cells
}

export interface NetLogRow extends NetEvent {
  durationMs: number
}

/** "Wi-Fi/LAN OK" counts as offline and "No data" rows are dropped; repeats merge. */
export function simplifyEvents(events: NetEvent[]): NetEvent[] {
  const out: NetEvent[] = []
  for (const event of sortEvents(events)) {
    if (event.status === 'nodata') continue
    const status: NetStatus = event.status === 'lan' ? 'offline' : event.status
    if (out.at(-1)?.status === status) continue
    out.push({ ...event, status })
  }
  return out
}

/** Log rows, newest first, each with how long that status lasted. */
export function logRows(events: NetEvent[], now: number, simplify = false): NetLogRow[] {
  const list = simplify ? simplifyEvents(events) : sortEvents(events)
  const rows = list.map((event, i) => ({ ...event, durationMs: Math.max(0, (list[i + 1]?.at ?? now) - event.at) }))
  return rows.reverse()
}
