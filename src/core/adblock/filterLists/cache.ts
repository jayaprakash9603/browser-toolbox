import { get, set } from '@/core/storage'

const CACHE_PREFIX = 'adblockListCache:'

export interface CachedFilterList {
  text: string
  fetchedAt: number
}

export async function readCachedList(id: string): Promise<CachedFilterList | null> {
  const data = await get<CachedFilterList>(`${CACHE_PREFIX}${id}`)
  return data ?? null
}

export async function writeCachedList(id: string, text: string): Promise<void> {
  await set(`${CACHE_PREFIX}${id}`, { text, fetchedAt: Date.now() } satisfies CachedFilterList)
}

export async function fetchListText(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: 'no-cache',
    headers: { 'user-agent': 'browser-toolbox-adblock' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

