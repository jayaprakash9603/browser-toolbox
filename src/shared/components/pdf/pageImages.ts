import { renderPdfPageBlob, type PdfDocumentHandle } from '@/core/engines/pdf/pdfjs'

interface Entry {
  url: string | null
  promise: Promise<string>
  /** Callers still waiting; a queued render with none left is skipped. */
  wanted: number
}

const caches = new WeakMap<PdfDocumentHandle, Map<string, Entry>>()
const MAX_CONCURRENT = 2
let running = 0
const queue: (() => void)[] = []

function next() {
  if (running >= MAX_CONCURRENT) return
  const run = queue.shift()
  if (run) run()
}

function cacheFor(doc: PdfDocumentHandle) {
  let cache = caches.get(doc)
  if (!cache) {
    cache = new Map()
    caches.set(doc, cache)
  }
  return cache
}

/** Rounds widths up so nearby sizes share one render. */
export function renderBucket(pixels: number): number {
  return Math.min(2560, Math.max(160, Math.ceil(pixels / 160) * 160))
}

export class RenderSkipped extends Error {
  constructor() {
    super('Render skipped')
    this.name = 'RenderSkipped'
  }
}

/**
 * Object URL for a page rendered `pixelWidth` wide, cached per document and rendered
 * two at a time. Aborting before the render starts drops it from the queue.
 */
export function pageImageUrl(
  doc: PdfDocumentHandle,
  pageNumber: number,
  pageWidth: number,
  pixelWidth: number,
  signal?: AbortSignal,
): Promise<string> {
  const cache = cacheFor(doc)
  const key = `${pageNumber}:${pixelWidth}`
  let entry = cache.get(key)
  if (entry?.url) return Promise.resolve(entry.url)
  if (!entry) {
    const created: Entry = { url: null, wanted: 0, promise: Promise.resolve('') }
    created.promise = new Promise<string>((resolve, reject) => {
      queue.push(() => {
        if (created.wanted <= 0) {
          cache.delete(key)
          reject(new RenderSkipped())
          next()
          return
        }
        running += 1
        renderPdfPageBlob(doc, pageNumber, { scale: pixelWidth / pageWidth, type: 'image/webp', quality: 0.92 })
          .then((blob) => {
            created.url = URL.createObjectURL(blob)
            resolve(created.url)
          })
          .catch((error: unknown) => {
            cache.delete(key)
            reject(error)
          })
          .finally(() => {
            running -= 1
            next()
          })
      })
    })
    cache.set(key, created)
    entry = created
  }
  const current = entry
  current.wanted += 1
  signal?.addEventListener('abort', () => {
    current.wanted -= 1
  })
  // Only after counting this caller, or a job that starts right away would skip itself.
  next()
  return current.promise
}

/** Revokes every cached image of a document; call when the document closes. */
export function releasePageImages(doc: PdfDocumentHandle): void {
  const cache = caches.get(doc)
  if (!cache) return
  for (const entry of cache.values()) {
    if (entry.url) URL.revokeObjectURL(entry.url)
    entry.wanted = 0
  }
  caches.delete(doc)
}
