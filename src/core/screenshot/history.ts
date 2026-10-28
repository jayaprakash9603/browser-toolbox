import { sanitizeFilenamePart } from './filename'

const DB_NAME = 'toolbox-screenshots'
const STORE = 'captures'
const MAX_ENTRIES = 50
const CHANNEL = 'toolbox-screenshot-history'

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
}

export interface ScreenshotHistoryEntry {
  id: string
  createdAt: number
  thumbnail: string
  blob: Blob
  title: string
  url: string
  mode: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addScreenshotHistory(entry: ScreenshotHistoryEntry): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  await trimHistory()
  db.close()
  notifyHistoryChanged()
}

export function historyEntryExtension(entry: Pick<ScreenshotHistoryEntry, 'blob'>): string {
  return EXTENSION_BY_MIME[entry.blob.type] ?? 'png'
}

export function historyEntryFilename(entry: Pick<ScreenshotHistoryEntry, 'blob' | 'title'>): string {
  return `${sanitizeFilenamePart(entry.title)}.${historyEntryExtension(entry)}`
}

/** Calls `onChange` when any extension page adds or deletes a saved capture. */
export function watchScreenshotHistory(onChange: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  const channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = onChange
  return () => channel.close()
}

function notifyHistoryChanged(): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(CHANNEL)
  channel.postMessage('changed')
  channel.close()
}

async function trimHistory(): Promise<void> {
  const db = await openDb()
  const all = await listAll(db)
  if (all.length <= MAX_ENTRIES) {
    db.close()
    return
  }
  const sorted = all.sort((a, b) => b.createdAt - a.createdAt)
  const toDelete = sorted.slice(MAX_ENTRIES)
  const tx = db.transaction(STORE, 'readwrite')
  for (const row of toDelete) tx.objectStore(STORE).delete(row.id)
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve()
  })
  db.close()
}

function listAll(db: IDBDatabase): Promise<ScreenshotHistoryEntry[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as ScreenshotHistoryEntry[])
    req.onerror = () => reject(req.error)
  })
}

export async function listScreenshotHistory(): Promise<ScreenshotHistoryEntry[]> {
  if (typeof indexedDB === 'undefined') return []
  try {
    const db = await openDb()
    const rows = await listAll(db)
    db.close()
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export async function deleteScreenshotHistory(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  notifyHistoryChanged()
}

export async function getScreenshotHistory(id: string): Promise<ScreenshotHistoryEntry | undefined> {
  const db = await openDb()
  const row = await new Promise<ScreenshotHistoryEntry | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as ScreenshotHistoryEntry | undefined)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return row
}
