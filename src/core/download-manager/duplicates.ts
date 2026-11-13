import { normalizeResourceUrl } from './urls'

export function duplicateKey(url: string, filename?: string): string {
  const norm = normalizeResourceUrl(url)
  const name = (filename ?? '').toLowerCase().trim()
  return name ? `${norm}|${name}` : norm
}

export function filterDuplicates<T extends { url: string; label?: string }>(
  items: T[],
  existingKeys: Set<string>,
  policy: 'skip' | 'flag',
): { items: T[]; skipped: number } {
  if (policy === 'flag') return { items, skipped: 0 }
  const seen = new Set<string>()
  const out: T[] = []
  let skipped = 0
  for (const item of items) {
    const key = duplicateKey(item.url, item.label)
    if (existingKeys.has(key) || seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    out.push(item)
  }
  return { items: out, skipped }
}
