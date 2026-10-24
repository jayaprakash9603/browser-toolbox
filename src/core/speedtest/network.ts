import type { SpeedServer } from './types'

const IPWHO_BASE = 'https://ipwho.is'
const REVERSE_GEOCODE = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

type Json = Record<string, unknown>

const str = (obj: Json | undefined, k: string) =>
  obj && typeof obj[k] === 'string' && obj[k] ? (obj[k] as string) : undefined
const obj = (v: unknown): Json | undefined => (v && typeof v === 'object' ? (v as Json) : undefined)

/** ISP name and approximate (IP-based) location. Never throws unless aborted; returns `{}` on failure. */
export async function lookupConnection(
  ip?: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<SpeedServer> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  try {
    const res = await fetchImpl(`${IPWHO_BASE}/${ip ?? ''}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: options.signal,
    })
    const data = (await res.json()) as Json
    if (data.success === false) return {}
    const connection = obj(data.connection)
    const asn = connection?.asn
    return {
      ip: str(data, 'ip'),
      isp: str(connection, 'isp') ?? str(connection, 'org'),
      asn: typeof asn === 'number' ? asn : undefined,
      clientCity: str(data, 'city'),
      clientRegion: str(data, 'region'),
      clientCountry: str(data, 'country'),
    }
  } catch (error) {
    if (options.signal?.aborted) throw error
    return {}
  }
}

export interface PlaceName {
  city?: string
  region?: string
  country?: string
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; language?: string } = {},
): Promise<PlaceName> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: options.language ?? 'en',
  })
  const res = await fetchImpl(`${REVERSE_GEOCODE}?${params}`, { credentials: 'omit', signal: options.signal })
  if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`)
  const data = (await res.json()) as Json
  return {
    city: str(data, 'city') ?? str(data, 'locality'),
    region: str(data, 'principalSubdivision'),
    country: str(data, 'countryName'),
  }
}

/** Drops empty values so a partial lookup never overwrites known fields. */
export function mergeServer(...parts: (SpeedServer | null | undefined)[]): SpeedServer {
  const out: SpeedServer = {}
  for (const part of parts) {
    if (!part) continue
    for (const [k, v] of Object.entries(part)) {
      if (v !== undefined && v !== '') (out as Record<string, unknown>)[k] = v
    }
  }
  return out
}

export function formatPlace(place: PlaceName | null | undefined): string {
  if (!place) return ''
  return [...new Set([place.city, place.region, place.country].filter(Boolean))].join(', ')
}
