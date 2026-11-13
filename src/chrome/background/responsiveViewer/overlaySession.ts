const SESSION_KEY = 'simulatorOverlayByTab'

export type SimulatorOverlaySession = {
  previewUrl: string
  deviceId?: string
  mobileUa?: string
}

type SessionMap = Record<string, SimulatorOverlaySession>

async function readMap(): Promise<SessionMap> {
  const raw = (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY]
  return raw && typeof raw === 'object' ? (raw as SessionMap) : {}
}

async function writeMap(map: SessionMap): Promise<void> {
  if (Object.keys(map).length === 0) await chrome.storage.session.remove(SESSION_KEY)
  else await chrome.storage.session.set({ [SESSION_KEY]: map })
}

export async function markOverlaySession(
  tabId: number,
  session: SimulatorOverlaySession,
): Promise<void> {
  const map = await readMap()
  map[String(tabId)] = session
  await writeMap(map)
}

export async function clearOverlaySession(tabId: number): Promise<void> {
  const map = await readMap()
  if (!map[String(tabId)]) return
  delete map[String(tabId)]
  await writeMap(map)
}

export async function getOverlaySession(tabId: number): Promise<SimulatorOverlaySession | null> {
  const map = await readMap()
  return map[String(tabId)] ?? null
}
