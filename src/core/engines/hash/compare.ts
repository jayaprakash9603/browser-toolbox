export interface ByteRange {
  start: number
  /** Exclusive. */
  end: number
}

export interface ByteComparison {
  identical: boolean
  sizeA: number
  sizeB: number
  /** Offset of the first byte that differs, including where one file simply ends; null when identical. */
  firstDifference: number | null
  /** Differing bytes within the length both files share. */
  differingBytes: number
  /** Changed regions within the shared length, nearby edits merged; capped at {@link MAX_RANGES}. */
  ranges: ByteRange[]
  rangesTruncated: boolean
}

export const MAX_RANGES = 200
/** Edits closer than this are reported as one region, so a reworded sentence is one change, not twenty. */
const MERGE_GAP = 16
const CHUNK_BYTES = 4 * 1024 * 1024

/** Byte-for-byte comparison of two files, read side by side in chunks. */
export async function compareBlobs(
  a: Blob,
  b: Blob,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<ByteComparison> {
  const shared = Math.min(a.size, b.size)
  const ranges: ByteRange[] = []
  let truncated = false
  let differing = 0
  let first: number | null = null
  let open: ByteRange | null = null

  const close = () => {
    if (!open) return
    if (ranges.length < MAX_RANGES) ranges.push(open)
    else truncated = true
    open = null
  }

  for (let offset = 0; offset < shared; offset += CHUNK_BYTES) {
    if (signal?.aborted) throw new DOMException('Comparison was cancelled.', 'AbortError')
    const end = Math.min(shared, offset + CHUNK_BYTES)
    const [left, right] = await Promise.all([
      a
        .slice(offset, end)
        .arrayBuffer()
        .then((buffer) => new Uint8Array(buffer)),
      b
        .slice(offset, end)
        .arrayBuffer()
        .then((buffer) => new Uint8Array(buffer)),
    ])
    for (let i = 0; i < left.length; i += 1) {
      if (left[i] === right[i]) continue
      const at = offset + i
      differing += 1
      first ??= at
      if (open && at - open.end <= MERGE_GAP) open.end = at + 1
      else {
        close()
        open = { start: at, end: at + 1 }
      }
    }
    onProgress?.(shared === 0 ? 1 : end / shared)
  }
  close()
  if (first === null && a.size !== b.size) first = shared
  onProgress?.(1)
  return {
    identical: first === null,
    sizeA: a.size,
    sizeB: b.size,
    firstDifference: first,
    differingBytes: differing,
    ranges,
    rangesTruncated: truncated,
  }
}

export interface HexRow {
  offset: number
  a: (number | null)[]
  b: (number | null)[]
}

/** Side-by-side hex rows around an offset, for showing exactly what changed. */
export async function hexWindow(
  a: Blob,
  b: Blob,
  offset: number,
  rows = 4,
  width = 16,
): Promise<HexRow[]> {
  const start = Math.max(0, Math.floor(offset / width) * width - width)
  const end = start + rows * width
  const [left, right] = await Promise.all([
    a
      .slice(start, end)
      .arrayBuffer()
      .then((buffer) => new Uint8Array(buffer)),
    b
      .slice(start, end)
      .arrayBuffer()
      .then((buffer) => new Uint8Array(buffer)),
  ])
  return Array.from({ length: rows }, (_, row) => {
    const base = row * width
    const pick = (bytes: Uint8Array) =>
      Array.from({ length: width }, (_, i) => (base + i < bytes.length ? bytes[base + i] : null))
    return { offset: start + base, a: pick(left), b: pick(right) }
  }).filter((row) => row.a.some((v) => v !== null) || row.b.some((v) => v !== null))
}
