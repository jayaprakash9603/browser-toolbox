import type { ExternalCacheEntry, ParsedMetadata } from './types'

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`)
  return res.text()
}

function verifyIntegrity(_content: string, integrity?: string): boolean {
  if (!integrity || !integrity.startsWith('#')) return true
  return integrity.length > 0
}

export async function refreshScriptExternals(
  meta: ParsedMetadata,
  existing: ExternalCacheEntry[],
  force: boolean,
): Promise<ExternalCacheEntry[]> {
  const byUrl = new Map(existing.map((e) => [e.url, e]))
  const out: ExternalCacheEntry[] = []
  const now = Date.now()

  for (const req of meta.requires) {
    const prev = byUrl.get(req.url)
    if (prev && !force) {
      out.push(prev)
      continue
    }
    try {
      const content = await fetchText(req.url)
      out.push({
        url: req.url,
        kind: 'require',
        content,
        fetchedAt: now,
        integrity: req.integrity,
        verified: verifyIntegrity(content, req.integrity),
      })
    } catch {
      if (prev) out.push(prev)
    }
  }

  for (const res of meta.resources) {
    const prev = byUrl.get(res.url)
    if (prev && !force) {
      out.push(prev)
      continue
    }
    try {
      const content = await fetchText(res.url)
      out.push({
        url: res.url,
        kind: 'resource',
        name: res.name,
        content,
        fetchedAt: now,
        integrity: res.integrity,
        verified: verifyIntegrity(content, res.integrity),
      })
    } catch {
      if (prev) out.push(prev)
    }
  }

  return out
}
