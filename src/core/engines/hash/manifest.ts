import { DIGEST_ALGORITHMS, type DigestAlgorithm, type Digests } from './digests'

export interface ManifestEntry {
  name: string
  hex: string
  algorithm: DigestAlgorithm
  line: number
}

export interface ParsedManifest {
  entries: ManifestEntry[]
  /** Line numbers that looked like neither format. */
  invalidLines: number[]
}

const BSD_TAGS: Record<string, DigestAlgorithm> = {
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
  SHA384: 'SHA-384',
  SHA1: 'SHA-1',
  MD5: 'MD5',
  CRC32: 'CRC32',
}

const GNU =
  /^\\?([0-9a-f]{8}|[0-9a-f]{32}|[0-9a-f]{40}|[0-9a-f]{64}|[0-9a-f]{96}|[0-9a-f]{128})\s[ *]?(.+)$/i
const BSD = /^([A-Z0-9-]+)\s*\((.+)\)\s*=\s*([0-9a-f]+)$/i

/**
 * Parses checksum lists from `sha256sum`/`md5sum` (`<hash>  name`, `<hash> *name`) and the BSD/macOS
 * `shasum --tag` style (`SHA256 (name) = <hash>`). Every supported digest has a distinct length, so
 * untagged lines are recognised by length.
 */
export function parseManifest(text: string): ParsedManifest {
  const entries: ManifestEntry[] = []
  const invalidLines: number[] = []
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith(';')) return
    const bsd = BSD.exec(line)
    if (bsd) {
      const algorithm = BSD_TAGS[bsd[1].toUpperCase().replace(/-/g, '')]
      if (algorithm) {
        entries.push({ name: bsd[2], hex: bsd[3].toLowerCase(), algorithm, line: index + 1 })
        return
      }
    }
    const gnu = GNU.exec(line)
    const algorithm = gnu && DIGEST_ALGORITHMS.find((a) => a.hexLength === gnu[1].length)?.id
    if (gnu && algorithm)
      entries.push({ name: gnu[2].trim(), hex: gnu[1].toLowerCase(), algorithm, line: index + 1 })
    else invalidLines.push(index + 1)
  })
  return { entries, invalidLines }
}

export function baseName(path: string): string {
  return path.replace(/^\.\//, '').split(/[\\/]/).pop() ?? path
}

export interface HashedItem {
  id: string
  /** Relative path when added from a folder, otherwise the file name. */
  path: string
  digests: Digests
}

export type ManifestStatus = 'verified' | 'modified' | 'missing' | 'pending'

export interface ManifestRow {
  entry: ManifestEntry
  status: ManifestStatus
  item?: HashedItem
}

function findItem(entry: ManifestEntry, items: readonly HashedItem[]): HashedItem | undefined {
  const target = entry.name.replace(/^\.\//, '').replace(/\\/g, '/')
  const exact = items.find((item) => item.path === target || item.path.endsWith(`/${target}`))
  if (exact) return exact
  const base = baseName(target)
  return (
    items.find((item) => baseName(item.path) === base) ??
    items.find((item) => baseName(item.path).toLowerCase() === base.toLowerCase())
  )
}

/** Checks each listed file against what was hashed. Files not in the list are reported separately. */
export function verifyManifest(manifest: ParsedManifest, items: readonly HashedItem[]) {
  const used = new Set<string>()
  const rows: ManifestRow[] = manifest.entries.map((entry) => {
    const item = findItem(entry, items)
    if (!item) return { entry, status: 'missing' }
    used.add(item.id)
    const actual = item.digests[entry.algorithm]
    if (!actual) return { entry, status: 'pending', item }
    return { entry, status: actual === entry.hex ? 'verified' : 'modified', item }
  })
  return { rows, unlisted: items.filter((item) => !used.has(item.id)) }
}

/** A `sha256sum -c` compatible list. */
export function toManifest(
  items: readonly HashedItem[],
  algorithm: DigestAlgorithm,
  style: 'gnu' | 'bsd' = 'gnu',
): string {
  const tag = Object.entries(BSD_TAGS).find(([, id]) => id === algorithm)?.[0] ?? algorithm
  return items
    .filter((item) => item.digests[algorithm])
    .map((item) =>
      style === 'bsd'
        ? `${tag} (${item.path}) = ${item.digests[algorithm]}`
        : `${item.digests[algorithm]}  ${item.path}`,
    )
    .join('\n')
}
