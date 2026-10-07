export interface ToolPayload {
  toolId: string
  text?: string
  linkUrl?: string
  imageUrl?: string
  pageUrl?: string
  createdAt: number
}

const PAYLOAD_PREFIX = 'toolbox.payload.'
const PAYLOAD_TTL_MS = 5 * 60 * 1000

function storageArea(): chrome.storage.StorageArea | null {
  if (typeof chrome === 'undefined' || !chrome.storage) return null
  return chrome.storage.session ?? chrome.storage.local
}

export async function stashPayload(payload: Omit<ToolPayload, 'createdAt'>): Promise<boolean> {
  const area = storageArea()
  if (!area) return false
  try {
    await area.set({ [PAYLOAD_PREFIX + payload.toolId]: { ...payload, createdAt: Date.now() } })
    return true
  } catch {
    return false
  }
}

export async function consumePayload(toolId: string): Promise<ToolPayload | null> {
  const area = storageArea()
  if (!area) return null
  const key = PAYLOAD_PREFIX + toolId
  try {
    const stored = (await area.get(key)) as Record<string, ToolPayload | undefined>
    const payload = stored[key]
    await area.remove(key)
    if (!payload || Date.now() - payload.createdAt > PAYLOAD_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

export async function peekPayload(toolId: string): Promise<ToolPayload | null> {
  const area = storageArea()
  if (!area) return null
  try {
    const stored = (await area.get(PAYLOAD_PREFIX + toolId)) as Record<
      string,
      ToolPayload | undefined
    >
    const payload = stored[PAYLOAD_PREFIX + toolId]
    if (!payload || Date.now() - payload.createdAt > PAYLOAD_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

export async function clearStalePayloads(): Promise<void> {
  const area = storageArea()
  if (!area) return
  try {
    const stored = (await area.get(null)) as Record<string, unknown>
    const staleKeys = Object.entries(stored)
      .filter(
        ([key, value]) =>
          key.startsWith(PAYLOAD_PREFIX) &&
          Date.now() - ((value as ToolPayload).createdAt ?? 0) > PAYLOAD_TTL_MS,
      )
      .map(([key]) => key)
    if (staleKeys.length > 0) await area.remove(staleKeys)
  } catch {
    /* storage unavailable */
  }
}
