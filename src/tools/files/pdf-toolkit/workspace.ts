import type { ImagePageSize } from '@/core/engines/files/pdfImages'

import type { OpenPdf } from './session'

const META_KEY = 'pdf-toolkit.workspace'
const DB_NAME = 'pdf-toolkit-workspace'
const STORE = 'documents'
const DOC_ID = 'current'
const MAX_BYTES = 80 * 1024 * 1024
const SCAN_BLOB_PREFIX = 'scan:'

export type ScanFilter = 'color' | 'enhance' | 'gray' | 'bw'

export type ScanDraftMeta = {
  pages: { id: string; blobId: string; turn: number }[]
  filter: ScanFilter
  pageSize: ImagePageSize
}

export type PdfWorkspaceMeta = {
  version: 1
  tab: string
  doc?: { name: string; blobId: string; password?: string; edited: boolean }
  locked?: { name: string; blobId: string; incorrect?: boolean }
  scan?: ScanDraftMeta
}

export type RestoredScanPage = {
  id: string
  blob: Blob
  turn: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function putBytes(id: string, bytes: Uint8Array): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(bytes, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function getBytes(id: string): Promise<Uint8Array | null> {
  const db = await openDb()
  const bytes = await new Promise<Uint8Array | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id) as IDBRequest<Uint8Array | undefined>
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return bytes ?? null
}

async function deleteBytes(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function writeMeta(meta: PdfWorkspaceMeta): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [META_KEY]: meta })
    return
  }
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export async function readPdfWorkspaceMeta(): Promise<PdfWorkspaceMeta | null> {
  let raw: PdfWorkspaceMeta | undefined
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const stored = await chrome.storage.local.get(META_KEY)
    raw = stored[META_KEY] as PdfWorkspaceMeta | undefined
  } else {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(META_KEY) ?? 'null')
      raw = parsed && typeof parsed === 'object' ? (parsed as PdfWorkspaceMeta) : undefined
    } catch {
      raw = undefined
    }
  }
  if (!raw || raw.version !== 1 || typeof raw.tab !== 'string') return null
  return raw
}

export async function loadPdfWorkspace(): Promise<{ meta: PdfWorkspaceMeta; bytes: Uint8Array | null } | null> {
  const meta = await readPdfWorkspaceMeta()
  if (!meta) return null
  const blobId = meta.doc?.blobId ?? meta.locked?.blobId
  const bytes = blobId ? await getBytes(blobId) : null
  return { meta, bytes }
}

export async function persistOpenDocument(doc: Pick<OpenPdf, 'name' | 'bytes' | 'password' | 'edited'>, tab: string): Promise<void> {
  if (doc.bytes.byteLength > MAX_BYTES) return
  await putBytes(DOC_ID, doc.bytes)
  await writeMeta({
    version: 1,
    tab,
    doc: { name: doc.name, blobId: DOC_ID, password: doc.password, edited: doc.edited },
  })
}

export async function persistLockedDocument(
  name: string,
  bytes: Uint8Array,
  tab: string,
  incorrect?: boolean,
): Promise<void> {
  if (bytes.byteLength > MAX_BYTES) return
  await putBytes(DOC_ID, bytes)
  await writeMeta({
    version: 1,
    tab,
    locked: { name, blobId: DOC_ID, incorrect },
  })
}

export async function persistWorkspaceTab(tab: string): Promise<void> {
  const meta = await readPdfWorkspaceMeta()
  if (!meta) {
    await writeMeta({ version: 1, tab })
    return
  }
  await writeMeta({ ...meta, tab })
}

export async function clearPdfWorkspaceDocument(): Promise<void> {
  await deleteBytes(DOC_ID)
  const meta = await readPdfWorkspaceMeta()
  if (!meta) return
  const next: PdfWorkspaceMeta = { version: 1, tab: meta.tab }
  await writeMeta(next)
}

function scanBlobId(pageId: string): string {
  return `${SCAN_BLOB_PREFIX}${pageId}`
}

async function deleteScanBlobs(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteBytes(scanBlobId(id))))
}

export async function persistScanDraft(
  pages: { id: string; blob: Blob; turn: number }[],
  filter: ScanFilter,
  pageSize: ImagePageSize,
): Promise<void> {
  const meta = (await readPdfWorkspaceMeta()) ?? { version: 1 as const, tab: 'scan' }
  const previous = new Set(meta.scan?.pages.map((page) => page.id) ?? [])
  const nextIds = new Set(pages.map((page) => page.id))
  const removed = [...previous].filter((id) => !nextIds.has(id))
  if (removed.length) await deleteScanBlobs(removed)

  let total = 0
  const stored: ScanDraftMeta['pages'] = []
  for (const page of pages) {
    const blobId = scanBlobId(page.id)
    const bytes = new Uint8Array(await page.blob.arrayBuffer())
    total += bytes.byteLength
    if (total > MAX_BYTES) break
    await putBytes(blobId, bytes)
    stored.push({ id: page.id, blobId, turn: page.turn })
  }

  await writeMeta({
    ...meta,
    scan: stored.length ? { pages: stored, filter, pageSize } : undefined,
  })
}

export async function loadScanDraft(): Promise<{ filter: ScanFilter; pageSize: ImagePageSize; pages: RestoredScanPage[] } | null> {
  const meta = await readPdfWorkspaceMeta()
  if (!meta?.scan?.pages.length) return null
  const pages: RestoredScanPage[] = []
  for (const entry of meta.scan.pages) {
    const bytes = await getBytes(entry.blobId)
    if (!bytes) continue
    pages.push({
      id: entry.id,
      blob: new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }),
      turn: entry.turn,
    })
  }
  if (!pages.length) return null
  return { filter: meta.scan.filter, pageSize: meta.scan.pageSize, pages }
}