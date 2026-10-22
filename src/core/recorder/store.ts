import type { RecordingMeta } from './types'

const DB_NAME = 'toolbox-recordings'
const DB_VERSION = 1
const META = 'meta'
const CHUNKS = 'chunks'

interface ChunkRow {
  recordingId: string
  seq: number
  blob: Blob
}

let dbPromise: Promise<IDBDatabase> | null = null

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'id' }).createIndex('createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains(CHUNKS)) {
        db.createObjectStore(CHUNKS, { keyPath: ['recordingId', 'seq'] }).createIndex('recordingId', 'recordingId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function appendChunk(recordingId: string, seq: number, blob: Blob): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(CHUNKS, 'readwrite')
  tx.objectStore(CHUNKS).put({ recordingId, seq, blob } satisfies ChunkRow)
  await done(tx)
}

export async function saveMeta(meta: RecordingMeta): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(META, 'readwrite')
  tx.objectStore(META).put(meta)
  await done(tx)
}

export async function getMeta(id: string): Promise<RecordingMeta | undefined> {
  if (!hasIndexedDb()) return undefined
  const db = await openDb()
  return request(db.transaction(META).objectStore(META).get(id) as IDBRequest<RecordingMeta | undefined>)
}

export async function listRecordings(): Promise<RecordingMeta[]> {
  if (!hasIndexedDb()) return []
  try {
    const db = await openDb()
    const all = await request(db.transaction(META).objectStore(META).getAll() as IDBRequest<RecordingMeta[]>)
    return all.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

async function chunkRows(recordingId: string): Promise<ChunkRow[]> {
  const db = await openDb()
  const index = db.transaction(CHUNKS).objectStore(CHUNKS).index('recordingId')
  const rows = await request(index.getAll(IDBKeyRange.only(recordingId)) as IDBRequest<ChunkRow[]>)
  return rows.sort((a, b) => a.seq - b.seq)
}

export async function getRecordingBlob(id: string, mimeType: string): Promise<Blob> {
  const rows = await chunkRows(id)
  return new Blob(rows.map((r) => r.blob), { type: mimeType })
}

export async function renameRecording(id: string, name: string): Promise<void> {
  const meta = await getMeta(id)
  if (meta) await saveMeta({ ...meta, name })
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([META, CHUNKS], 'readwrite')
  tx.objectStore(META).delete(id)
  tx.objectStore(CHUNKS).delete(IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]))
  await done(tx)
}

export function subscribeRecordings(onChange: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  const channel = new BroadcastChannel(DB_NAME)
  channel.onmessage = () => onChange()
  return () => channel.close()
}

export function notifyRecordingsChanged(): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(DB_NAME)
  channel.postMessage('changed')
  channel.close()
}
