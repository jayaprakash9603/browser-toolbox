import type { BookmarkRow } from '@/tools/productivity/bookmarks/service'

import { canonicalizeBookmarkUrl, hostnameOf } from './urls'

export type DuplicateKind = 'exact' | 'normalized' | 'title' | 'domain'

export interface DuplicateGroup {
  id: string
  kind: DuplicateKind
  key: string
  rows: BookmarkRow[]
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on'])

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP.has(token)),
  )
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let hit = 0
  for (const token of a) if (b.has(token)) hit += 1
  return hit / Math.min(a.size, b.size)
}

function grouped(kind: DuplicateKind, map: Map<string, BookmarkRow[]>): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  for (const [key, rows] of map) {
    if (rows.length < 2) continue
    groups.push({ id: `${kind}:${key}`, kind, key, rows })
  }
  return groups
}

export function exactUrlGroups(rows: readonly BookmarkRow[]): DuplicateGroup[] {
  const map = new Map<string, BookmarkRow[]>()
  for (const row of rows) {
    const key = row.url.trim()
    map.set(key, [...(map.get(key) ?? []), row])
  }
  return grouped('exact', map)
}

export function normalizedUrlGroups(rows: readonly BookmarkRow[]): DuplicateGroup[] {
  const map = new Map<string, BookmarkRow[]>()
  for (const row of rows) {
    const key = canonicalizeBookmarkUrl(row.url)
    map.set(key, [...(map.get(key) ?? []), row])
  }
  return grouped('normalized', map)
}

export function titleSimilarGroups(rows: readonly BookmarkRow[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const used = new Set<string>()
  for (let i = 0; i < rows.length; i += 1) {
    if (used.has(rows[i].id)) continue
    const cluster = [rows[i]]
    const tokens = titleTokens(rows[i].title)
    for (let j = i + 1; j < rows.length; j += 1) {
      if (used.has(rows[j].id)) continue
      if (tokenOverlap(tokens, titleTokens(rows[j].title)) < 0.7) continue
      cluster.push(rows[j])
    }
    if (cluster.length < 2) continue
    cluster.forEach((row) => used.add(row.id))
    groups.push({
      id: `title:${rows[i].id}`,
      kind: 'title',
      key: rows[i].title,
      rows: cluster,
    })
  }
  return groups
}

export function sameDomainPathGroups(rows: readonly BookmarkRow[]): DuplicateGroup[] {
  const map = new Map<string, BookmarkRow[]>()
  for (const row of rows) {
    try {
      const parsed = new URL(row.url)
      const key = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}`
      map.set(key, [...(map.get(key) ?? []), row])
    } catch {
      continue
    }
  }
  return grouped('domain', map)
}

export function duplicateReviewGroups(rows: readonly BookmarkRow[]): DuplicateGroup[] {
  const seen = new Set<string>()
  const merged: DuplicateGroup[] = []
  for (const group of [
    ...exactUrlGroups(rows),
    ...normalizedUrlGroups(rows),
    ...sameDomainPathGroups(rows),
    ...titleSimilarGroups(rows),
  ]) {
    const signature = group.rows
      .map((row) => row.id)
      .sort()
      .join(',')
    if (seen.has(signature)) continue
    seen.add(signature)
    merged.push(group)
  }
  return merged
}

export function duplicateIdsFromGroups(groups: readonly DuplicateGroup[]): Set<string> {
  const ids = new Set<string>()
  for (const group of groups) group.rows.forEach((row) => ids.add(row.id))
  return ids
}

export function domainOf(row: BookmarkRow): string {
  return hostnameOf(row.url)
}
