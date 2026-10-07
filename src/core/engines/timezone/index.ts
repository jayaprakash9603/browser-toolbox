export type TimezoneResult<T> = { ok: true; value: T } | { ok: false; error: string }

export const COMMON_TIMEZONES: { id: string; label: string }[] = [
  { id: 'UTC', label: 'UTC' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Berlin', label: 'Berlin' },
  { id: 'Europe/Paris', label: 'Paris' },
  { id: 'Europe/Helsinki', label: 'Helsinki' },
  { id: 'Europe/Istanbul', label: 'Istanbul' },
  { id: 'Asia/Kolkata', label: 'India (IST)' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Chicago', label: 'Chicago' },
  { id: 'America/Denver', label: 'Denver' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'America/Sao_Paulo', label: 'São Paulo' },
  { id: 'Pacific/Auckland', label: 'Auckland' },
]

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

export function formatInTimeZone(date: Date, timeZone: string): TimezoneResult<string> {
  if (!isValidTimeZone(timeZone)) return { ok: false, error: `Unknown timezone "${timeZone}".` }
  return {
    ok: true,
    value: new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(date),
  }
}

export function timeZoneOffsetMinutes(date: Date, timeZone: string): TimezoneResult<number> {
  if (!isValidTimeZone(timeZone)) return { ok: false, error: `Unknown timezone "${timeZone}".` }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  )
  return { ok: true, value: Math.round((asUtc - date.getTime()) / 60_000) }
}

export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${hours}:${minutes}`
}

export interface TimezoneConversion {
  timeZone: string
  formatted: string
  offset: string
}

export function convertToTimeZones(date: Date, timeZones: string[]): TimezoneConversion[] {
  return timeZones
    .filter(isValidTimeZone)
    .map((timeZone) => {
      const formatted = formatInTimeZone(date, timeZone)
      const offset = timeZoneOffsetMinutes(date, timeZone)
      return {
        timeZone,
        formatted: formatted.ok ? formatted.value : '—',
        offset: offset.ok ? formatOffset(offset.value) : '—',
      }
    })
}
