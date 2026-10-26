import type { StorageSnapshot, StorageWriteResult } from '@/chrome/content/index'
import { sendToActiveTab } from '@/tools/web/tabMessaging'

/** Page storage is read by the on-demand content script, which is not auto-injected. */
export async function loadStorageSnapshot(): Promise<StorageSnapshot | null> {
  try {
    const data = await sendToActiveTab<StorageSnapshot>({ type: 'GET_STORAGE_SNAPSHOT' })
    if (!data?.localStorage || !data.sessionStorage) return null
    return data
  } catch {
    return null
  }
}

export interface StorageWrite {
  area: 'local' | 'session'
  op: 'set' | 'remove' | 'clear' | 'merge'
  key?: string
  value?: string
  entries?: Record<string, string>
}

/** Applies one change on the page and returns the fresh snapshot (or why it failed). */
export async function writeStorage(write: StorageWrite): Promise<StorageWriteResult> {
  try {
    const result = await sendToActiveTab<StorageWriteResult>({ type: 'STORAGE_WRITE', ...write })
    return result ?? { ok: false, error: 'unavailable' }
  } catch {
    return { ok: false, error: 'unavailable' }
  }
}
