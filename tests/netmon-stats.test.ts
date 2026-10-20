import { describe, expect, it } from 'vitest'

import {
  dailyStats,
  downsampleSamples,
  generalStats,
  hourStats,
  logRows,
  outageSegments,
  simplifyEvents,
  statsForWindow,
  toIntervals,
  weekdayStats,
} from '@/core/netmon/stats'
import { logToCsv, parseBackup } from '@/core/netmon/exporters'
import { formatAvailability, formatClockDuration, formatDuration } from '@/core/netmon/format'
import { normalizeNetSettings } from '@/core/netmon/service'
import type { NetEvent, NetSample } from '@/core/netmon/types'

const T0 = new Date(2026, 9, 20, 10, 0, 0).getTime()
const s = (sec: number) => T0 + sec * 1000

describe('toIntervals', () => {
  it('lets each event last until the next and clips the last one at now', () => {
    const events: NetEvent[] = [
      { at: s(30), status: 'offline' },
      { at: s(0), status: 'online' },
    ]
    expect(toIntervals(events, s(45))).toEqual([
      { start: s(0), end: s(30), status: 'online' },
      { start: s(30), end: s(45), status: 'offline' },
    ])
  })
})

describe('statsForWindow', () => {
  it('computes availability, downtime and disconnects', () => {
    const events: NetEvent[] = [
      { at: s(0), status: 'online' },
      { at: s(60), status: 'offline' },
      { at: s(80), status: 'lan' },
      { at: s(90), status: 'online' },
    ]
    const stats = statsForWindow(toIntervals(events, s(120)), s(0), s(120))
    expect(stats.onlineMs).toBe(90_000)
    expect(stats.downtimeMs).toBe(30_000)
    expect(stats.availability).toBeCloseTo(0.75)
    expect(stats.disconnects).toBe(1)
  })

  it('excludes "No data" gaps and still counts a drop that happened across one', () => {
    const events: NetEvent[] = [
      { at: s(0), status: 'online' },
      { at: s(10), status: 'nodata' },
      { at: s(1000), status: 'offline' },
      { at: s(1010), status: 'nodata' },
      { at: s(2000), status: 'offline' },
    ]
    const stats = statsForWindow(toIntervals(events, s(2010)), -Infinity, Infinity)
    expect(stats.onlineMs).toBe(10_000)
    expect(stats.downtimeMs).toBe(20_000)
    expect(stats.disconnects).toBe(1)
  })

  it('reports null availability when there is no monitored time', () => {
    expect(statsForWindow([], 0, 1).availability).toBeNull()
  })
})

describe('bucketed stats', () => {
  it('splits time at hour boundaries', () => {
    const start = new Date(2026, 9, 20, 9, 30).getTime()
    const events: NetEvent[] = [{ at: start, status: 'online' }]
    const hours = hourStats(events, start + 60 * 60_000)
    expect(hours[9].onlineMs).toBe(30 * 60_000)
    expect(hours[10].onlineMs).toBe(30 * 60_000)
    expect(hours[9].label).toBe('9 AM-10 AM')
  })

  it('assigns disconnects to the weekday they started on', () => {
    const events: NetEvent[] = [
      { at: s(0), status: 'online' },
      { at: s(5), status: 'offline' },
    ]
    const days = weekdayStats(events, s(10))
    expect(days[new Date(T0).getDay()].disconnects).toBe(1)
    expect(days.reduce((n, d) => n + d.disconnects, 0)).toBe(1)
  })

  it('returns one daily bucket per day ending today', () => {
    const events: NetEvent[] = [{ at: s(0), status: 'online' }]
    const daily = dailyStats(events, s(60), 30)
    expect(daily).toHaveLength(30)
    expect(daily.at(-1)!.onlineMs).toBe(60_000)
    expect(daily[0].availability).toBeNull()
  })

  it('builds today/7d/30d/all windows', () => {
    const events: NetEvent[] = [
      { at: s(-40 * 86_400), status: 'online' },
      { at: s(-40 * 86_400 + 60), status: 'offline' },
      { at: s(-40 * 86_400 + 120), status: 'nodata' },
      { at: s(0), status: 'online' },
    ]
    const g = generalStats(events, s(60))
    expect(g.all.disconnects).toBe(1)
    expect(g.month.disconnects).toBe(0)
    expect(g.today.availability).toBe(1)
  })
})

describe('log helpers', () => {
  const events: NetEvent[] = [
    { at: s(0), status: 'online', ip: '1.2.3.4' },
    { at: s(10), status: 'lan' },
    { at: s(20), status: 'offline' },
    { at: s(30), status: 'nodata' },
    { at: s(40), status: 'online', ip: '1.2.3.4' },
  ]

  it('simplifies LAN-only to offline, drops No data and merges repeats', () => {
    expect(simplifyEvents(events).map((e) => e.status)).toEqual(['online', 'offline', 'online'])
  })

  it('lists rows newest first with durations', () => {
    const rows = logRows(events, s(50))
    expect(rows[0]).toMatchObject({ status: 'online', durationMs: 10_000 })
    expect(rows.at(-1)).toMatchObject({ status: 'online', durationMs: 10_000 })
  })

  it('exports CSV with the selected formats', () => {
    const csv = logToCsv(logRows(events, s(50)).slice(0, 2), {
      dateFormat: 'iso',
      statusFormat: 'system',
      simplify: false,
      durationFormat: 'seconds',
    })
    const [header, first, second] = csv.split('\n')
    expect(header).toBe('Date and time,Status,Status duration,Your IP')
    expect(first).toBe('2026-10-20 10:00:40,online,10,1.2.3.4')
    expect(second).toBe('2026-10-20 10:00:30,no_data,10,')
  })

  it('validates backups', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/)
    expect(() => parseBackup('{"app":"other","events":[]}')).toThrow(/backup/)
    const backup = parseBackup(
      JSON.stringify({
        app: 'browser-toolbox.internet-monitor',
        version: 1,
        events: [{ at: 1, status: 'online' }, { at: 'x', status: 'online' }, { at: 2, status: 'bogus' }],
      }),
    )
    expect(backup.events).toEqual([{ at: 1, status: 'online' }])
  })
})

describe('realtime helpers', () => {
  it('downsamples while keeping the worst status in each bucket', () => {
    const samples: NetSample[] = Array.from({ length: 1000 }, (_, i) => ({
      at: s(i),
      status: i === 501 ? 'offline' : 'online',
      latency: i === 501 ? null : 20,
    }))
    const points = downsampleSamples(samples, s(0), s(999), 100)
    expect(points.length).toBeLessThanOrEqual(101)
    expect(points.filter((p) => p.status === 'offline')).toHaveLength(1)
    expect(points[0].latency).toBe(20)
  })

  it('merges adjacent outage points into segments', () => {
    const segments = outageSegments(
      [
        { at: 0, latency: 10, status: 'online' },
        { at: 1, latency: null, status: 'offline' },
        { at: 2, latency: null, status: 'offline' },
        { at: 3, latency: 12, status: 'online' },
        { at: 4, latency: null, status: 'lan' },
      ],
      5,
    )
    expect(segments).toEqual([
      { start: 1, end: 3, status: 'offline' },
      { start: 4, end: 5, status: 'lan' },
    ])
  })
})

describe('formatting and settings', () => {
  it('formats durations and availability', () => {
    expect(formatClockDuration(3_723_000)).toBe('1:02:03')
    expect(formatDuration(3_723_000, 'seconds')).toBe('3723')
    expect(formatAvailability(0.98765)).toBe('98.77%')
    expect(formatAvailability(null)).toBe('—')
  })

  it('normalizes stored settings', () => {
    const settings = normalizeNetSettings({
      intervalSec: 7 as never,
      pingUrl: 'ftp://x',
      volume: 4,
      log: { simplify: true } as never,
    })
    expect(settings.intervalSec).toBe(3)
    expect(settings.pingUrl).toMatch(/^https:/)
    expect(settings.volume).toBe(1)
    expect(settings.log).toMatchObject({ simplify: true, dateFormat: 'default' })
  })
})
