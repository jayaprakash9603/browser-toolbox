import type { Digests } from '@/core/engines/hash/digests'

const KEY = 'tbx.hash.baseline.v1'

export interface BaselineRecord {
  path: string
  size: number
  lastModified: number
  digests: Digests
  savedAt: string
}

export type BaselineVerdict = 'none' | 'match' | 'modified' | 'metadata-changed'

function readAll(): Record<string, BaselineRecord> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, BaselineRecord>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, BaselineRecord>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // Private mode or quota — baselines still work for this session via memory if needed.
  }
}

/** Stable key for a file identity (name + size + last modified). */
export function baselineKey(path: string, size: number, lastModified: number): string {
  return `${path}|${size}|${lastModified}`
}

export function loadBaseline(key: string): BaselineRecord | undefined {
  return readAll()[key]
}

export function saveBaseline(record: BaselineRecord): void {
  const key = baselineKey(record.path, record.size, record.lastModified)
  writeAll({ ...readAll(), [key]: record })
}

export function clearBaseline(key: string): void {
  const map = readAll()
  delete map[key]
  writeAll(map)
}

/** Compare fresh digests to a saved baseline for the same file path. */
export function compareToBaseline(
  path: string,
  size: number,
  lastModified: number,
  digests: Digests,
): BaselineVerdict {
  const entries = Object.values(readAll()).filter((b) => b.path === path)
  if (entries.length === 0) return 'none'
  const latest = entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0]
  const primary = digests['SHA-256'] ?? digests.MD5 ?? Object.values(digests)[0]
  const base = latest.digests['SHA-256'] ?? latest.digests.MD5 ?? Object.values(latest.digests)[0]
  if (!primary || !base) return 'modified'
  if (primary !== base) return 'modified'
  if (latest.size !== size || latest.lastModified !== lastModified) return 'metadata-changed'
  return 'match'
}
