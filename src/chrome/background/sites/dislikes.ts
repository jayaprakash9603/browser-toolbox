const cache = new Map<string, { dislikes: number; rating: number }>()

export async function fetchDislikes(videoId: string): Promise<{ dislikes: number; rating: number } | null> {
  if (cache.has(videoId)) return cache.get(videoId)!
  try {
    const res = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${encodeURIComponent(videoId)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { dislikes?: number; rating?: number }
    const out = { dislikes: data.dislikes ?? 0, rating: data.rating ?? 0 }
    cache.set(videoId, out)
    return out
  } catch {
    return null
  }
}
