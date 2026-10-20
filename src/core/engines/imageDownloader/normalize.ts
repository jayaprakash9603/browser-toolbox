const SIZE_QUERY_KEYS = new Set(['w', 'h', 'width', 'height', 'resize', 'size', 's'])

export function normalizeImageUrl(url: string): string {
  if (url.startsWith('data:')) return url
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    for (const key of [...parsed.searchParams.keys()]) {
      if (SIZE_QUERY_KEYS.has(key.toLowerCase())) parsed.searchParams.delete(key)
    }
    return parsed.href
  } catch {
    return url.split('#')[0] ?? url
  }
}

export function guessExtFromUrl(url: string): string | null {
  if (url.startsWith('data:image/')) {
    const mime = /^data:image\/([^;,]+)/i.exec(url)?.[1]?.toLowerCase()
    if (mime === 'jpeg') return 'jpg'
    if (mime) return mime
    return null
  }
  try {
    const path = new URL(url).pathname.toLowerCase()
    const match = /\.([a-z0-9]{2,5})$/i.exec(path)
    return match?.[1] ?? null
  } catch {
    const match = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url.toLowerCase())
    return match?.[1] ?? null
  }
}
