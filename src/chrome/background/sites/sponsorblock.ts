import { pickSegmentsToSkip, type SponsorSegment } from '@/core/sites/youtube'

const cache = new Map<string, SponsorSegment[]>()

export async function fetchSponsorSegments(
  videoId: string,
  categories: string[],
): Promise<SponsorSegment[]> {
  const key = `${videoId}:${categories.join(',')}`
  if (cache.has(key)) return cache.get(key)!
  try {
    const res = await fetch(
      `https://sponsor.ajay.app/api/skipSegments/${encodeURIComponent(videoId)}?categories=${encodeURIComponent(categories.join(','))}`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as SponsorSegment[]
    const filtered = pickSegmentsToSkip(data, categories)
    cache.set(key, filtered)
    return filtered
  } catch {
    return []
  }
}
