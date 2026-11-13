const DB_NAME = 'toolbox-bookmark-thumbs'
const STORE = 'thumbs'
const CHANNEL = 'toolbox-bookmark-thumbs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveBookmarkThumbnail(bookmarkId: string, dataUrl: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(dataUrl, bookmarkId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  new BroadcastChannel(CHANNEL).postMessage({ id: bookmarkId })
}

export async function loadBookmarkThumbnail(bookmarkId: string): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null
  const db = await openDb()
  const value = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(bookmarkId)
    req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return value
}

export function subscribeThumbnails(onChange: (id: string) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => undefined
  const channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (event) => {
    if (event.data?.id) onChange(String(event.data.id))
  }
  return () => channel.close()
}
