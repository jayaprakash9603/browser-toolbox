/** Direct Instagram video file, not a poster image or a blob: player URL. */
export function isVideoFileUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false
  if (url.length > 4000) return false
  if (/\.(?:jpg|jpeg|png|webp|gif|heic)(?:\?|$)/i.test(url)) return false
  if (/\.mp4(?:\?|$)/i.test(url) || /stp=dst-mp4/i.test(url) || /[?&]mime(?:_type)?=video/i.test(url)) return true
  // Some reel files have no extension. Image thumbnails use s150x150-style sizes and t51 paths.
  if (/s\d+x\d+/i.test(url)) return false
  return /(?:cdninstagram\.com|fbcdn\.net)/i.test(url) && /\/o1\/v\/t(?:2|16|50|66)\//i.test(url)
}

function rankVideoUrl(url: string): number {
  let score = 0
  if (/browser_native_hd|hd_url|\bhd\b/i.test(url)) score += 4
  const width = /[?&](?:oh|w|width)=(\d+)/i.exec(url)
  if (width) score += Math.min(6, Number(width[1]) / 300)
  if (/audio/i.test(url)) score -= 4
  return score
}

function best(urls: Iterable<string>): string | null {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const url of urls) {
    if (typeof url !== 'string' || seen.has(url) || !isVideoFileUrl(url)) continue
    seen.add(url)
    unique.push(url)
  }
  unique.sort((a, b) => rankVideoUrl(b) - rankVideoUrl(a))
  return unique[0] ?? null
}

/** Prefer URLs tied to this video. Fall back to other recent media responses. */
export function pickVideoUrl(preferred: Iterable<string>, extra: Iterable<string> = []): string | null {
  return best(preferred) ?? best(extra)
}
