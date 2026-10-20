/** `/shorts/ID` → `/watch?v=ID` */
export function shortsToWatchUrl(url: string): string | null {
  try {
    const parsed = new URL(url, 'https://www.youtube.com')
    const m = /^\/shorts\/([\w-]{11})/.exec(parsed.pathname)
    if (!m) return null
    return `https://www.youtube.com/watch?v=${m[1]}`
  } catch {
    return null
  }
}

export function parseKeywordList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function parseChannelList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

export function matchesKeyword(title: string, keywords: string[]): boolean {
  if (!keywords.length) return false
  const hay = title.toLowerCase()
  return keywords.some((k) => hay.includes(k))
}

export function matchesChannel(channelName: string, channelId: string, blocked: string[]): boolean {
  if (!blocked.length) return false
  const name = channelName.toLowerCase()
  const id = channelId.toLowerCase()
  return blocked.some((b) => name.includes(b) || id === b || name === b)
}

export function watchedPercentFromAria(aria: string | null): number | null {
  if (!aria) return null
  const m = /(\d+)\s*%/.exec(aria)
  return m ? Number(m[1]) : null
}

/** SponsorBlock privacy-preserving prefix (first 4 hex chars of SHA-256 of video id). */
export async function sponsorBlockPrefix(videoId: string): Promise<string> {
  const data = new TextEncoder().encode(videoId)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 4)
}

export interface SponsorSegment {
  segment: [number, number]
  category: string
  actionType?: string
}

export function pickSegmentsToSkip(
  segments: SponsorSegment[],
  allowedCategories: string[],
): SponsorSegment[] {
  const set = new Set(allowedCategories.map((c) => c.toLowerCase()))
  return segments.filter((s) => set.has(s.category.toLowerCase()) && s.actionType !== 'full')
}

export function isStillWatchingDialog(text: string): boolean {
  return /still watching|video paused|continue watching/i.test(text)
}

export function featureAttrName(id: string): string {
  return `data-tbx-yt-${id.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`
}

export function isFeatureOn(values: Record<string, unknown>, id: string): boolean {
  const v = values[id]
  return v === true || v === 'true'
}
