import type { ScreenshotSession } from '@/core/screenshot/types'

const SESSION_TTL_MS = 10 * 60 * 1000
const sessions = new Map<string, ScreenshotSession>()

function purgeExpired(): void {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id)
  }
}

export function createSession(session: ScreenshotSession): void {
  purgeExpired()
  sessions.set(session.id, session)
}

export function getSession(id: string): ScreenshotSession | undefined {
  purgeExpired()
  const session = sessions.get(id)
  if (!session) return undefined
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(id)
    return undefined
  }
  return session
}

export function deleteSession(id: string): void {
  sessions.delete(id)
}

/** @internal test helper */
export function _clearSessions(): void {
  sessions.clear()
}
