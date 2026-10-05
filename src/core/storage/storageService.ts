import { STORAGE_KEYS, STORAGE_VERSION } from '@/core/constants'
import { createLogger } from '@/core/logging'

const logger = createLogger('storage')

interface StorageMeta {
  storageVersion: number
}

async function ensureVersion() {
  const meta = (await get<StorageMeta>(STORAGE_KEYS.meta)) ?? { storageVersion: STORAGE_VERSION }
  if (meta.storageVersion < STORAGE_VERSION) {
    logger.info('migrating storage', meta.storageVersion, '->', STORAGE_VERSION)
    await set(STORAGE_KEYS.meta, { storageVersion: STORAGE_VERSION })
  }
}

export async function get<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

export async function set<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function remove(key: string): Promise<void> {
  await chrome.storage.local.remove(key)
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear()
  await set(STORAGE_KEYS.meta, { storageVersion: STORAGE_VERSION } satisfies StorageMeta)
}

export async function initStorage() {
  await ensureVersion()
}
