import type { HashQueueItem } from './types'

export type EntropyBand = 'low' | 'mid' | 'high'

export function entropyBand(entropy: number): EntropyBand {
  if (entropy < 5) return 'low'
  if (entropy < 7.2) return 'mid'
  return 'high'
}

export interface DuplicateGroup {
  hex: string
  ids: string[]
  paths: string[]
}

export interface TypeShare {
  label: string
  count: number
}

export interface SessionAnalytics {
  hashed: number
  pending: number
  errors: number
  totalBytes: number
  avgEntropy: number
  avgDurationMs: number
  bands: Record<EntropyBand, number>
  baselineMatch: number
  baselineModified: number
  baselineMetadata: number
  duplicates: DuplicateGroup[]
  duplicateFileCount: number
  types: TypeShare[]
  risky: number
}

export function findDuplicateGroups(items: readonly HashQueueItem[]): DuplicateGroup[] {
  const byHash = new Map<string, DuplicateGroup>()
  for (const item of items) {
    const hex = item.result?.digests['SHA-256']
    if (!hex || item.status !== 'done') continue
    const group = byHash.get(hex)
    if (group) {
      group.ids.push(item.id)
      group.paths.push(item.path)
    } else {
      byHash.set(hex, { hex, ids: [item.id], paths: [item.path] })
    }
  }
  return [...byHash.values()].filter((group) => group.ids.length > 1)
}

export function collectSessionAnalytics(items: readonly HashQueueItem[]): SessionAnalytics {
  const hashedItems = items.filter((item) => item.status === 'done' && item.result)
  const pending = items.filter((item) => item.status === 'pending' || item.status === 'hashing')
  const errors = items.filter((item) => item.status === 'error')
  const bands: Record<EntropyBand, number> = { low: 0, mid: 0, high: 0 }
  const typeCounts = new Map<string, number>()
  let entropySum = 0
  let durationSum = 0
  let baselineMatch = 0
  let baselineModified = 0
  let baselineMetadata = 0
  let risky = 0
  let totalBytes = 0

  for (const item of hashedItems) {
    const result = item.result!
    totalBytes += item.file.size
    entropySum += result.entropy
    durationSum += result.durationMs
    bands[entropyBand(result.entropy)] += 1
    if (item.baseline === 'match') baselineMatch += 1
    else if (item.baseline === 'modified') baselineModified += 1
    else if (item.baseline === 'metadata-changed') baselineMetadata += 1
    if (result.signature?.risky) risky += 1
    const label = result.signature?.label ?? 'unknown'
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1)
  }

  const duplicates = findDuplicateGroups(items)
  const types = [...typeCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  return {
    hashed: hashedItems.length,
    pending: pending.length,
    errors: errors.length,
    totalBytes,
    avgEntropy: hashedItems.length === 0 ? 0 : entropySum / hashedItems.length,
    avgDurationMs: hashedItems.length === 0 ? 0 : durationSum / hashedItems.length,
    bands,
    baselineMatch,
    baselineModified,
    baselineMetadata,
    duplicates,
    duplicateFileCount: duplicates.reduce((sum, group) => sum + group.ids.length, 0),
    types,
    risky,
  }
}

export type QueueSort = 'name' | 'size' | 'entropy'
export type QueueFilter = 'all' | 'duplicates' | 'modified' | 'high' | 'risky'

export function filterAndSortQueue(
  items: readonly HashQueueItem[],
  {
    query,
    sort,
    filter,
    duplicateIds,
  }: {
    query: string
    sort: QueueSort
    filter: QueueFilter
    duplicateIds: ReadonlySet<string>
  },
): HashQueueItem[] {
  const needle = query.trim().toLowerCase()
  const next = items.filter((item) => {
    if (needle && !item.path.toLowerCase().includes(needle) && !item.file.name.toLowerCase().includes(needle)) {
      return false
    }
    if (filter === 'duplicates') return duplicateIds.has(item.id)
    if (filter === 'modified') return item.baseline === 'modified'
    if (filter === 'high') return item.result != null && entropyBand(item.result.entropy) === 'high'
    if (filter === 'risky') return item.result?.signature?.risky === true
    return true
  })

  next.sort((a, b) => {
    if (sort === 'size') return b.file.size - a.file.size
    if (sort === 'entropy') return (b.result?.entropy ?? -1) - (a.result?.entropy ?? -1)
    return a.path.localeCompare(b.path)
  })
  return next
}
