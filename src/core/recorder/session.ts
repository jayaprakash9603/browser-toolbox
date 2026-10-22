import type { RecorderHost, RecorderSession, RecordingSource } from './types'

export const RECORDER_SESSION_KEY = 'recorderSession'

export function createSession(
  id: string,
  source: RecordingSource,
  host: RecorderHost,
  now: number,
  extra: Pick<RecorderSession, 'tabId' | 'windowId'> = {},
): RecorderSession {
  return { id, source, host, phase: 'pending', createdAt: now, startedAt: 0, pausedMs: 0, pausedAt: 0, ...extra }
}

export function markStarted(session: RecorderSession, now: number): RecorderSession {
  if (session.phase !== 'pending') return session
  return { ...session, phase: 'recording', startedAt: now }
}

export function markPaused(session: RecorderSession, now: number): RecorderSession {
  if (session.phase !== 'recording') return session
  return { ...session, phase: 'paused', pausedAt: now }
}

export function markResumed(session: RecorderSession, now: number): RecorderSession {
  if (session.phase !== 'paused') return session
  return { ...session, phase: 'recording', pausedMs: session.pausedMs + (now - session.pausedAt), pausedAt: 0 }
}

export function elapsedMs(session: RecorderSession, now: number): number {
  if (session.phase === 'pending' || !session.startedAt) return 0
  const end = session.phase === 'paused' ? session.pausedAt : now
  return Math.max(0, end - session.startedAt - session.pausedMs)
}
