import type { StorageSnapshot } from '@/chrome/content/index'
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
