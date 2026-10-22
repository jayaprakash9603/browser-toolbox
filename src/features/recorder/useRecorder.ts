import { useCallback, useEffect, useState } from 'react'

import { RECORDER_SESSION_KEY, elapsedMs } from '@/core/recorder/session'
import { listRecordings, subscribeRecordings } from '@/core/recorder/store'
import type { RecorderSession, RecordingMeta } from '@/core/recorder/types'

export function useRecordings() {
  const [recordings, setRecordings] = useState<RecordingMeta[]>([])
  const refresh = useCallback(() => {
    void listRecordings().then(setRecordings)
  }, [])

  useEffect(() => {
    refresh()
    return subscribeRecordings(refresh)
  }, [refresh])

  return { recordings, refresh }
}

/** Live recorder session mirrored from chrome.storage.session by the background. */
export function useRecorderSession() {
  const [session, setSession] = useState<RecorderSession | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.session) return
    void chrome.storage.session
      .get(RECORDER_SESSION_KEY)
      .then((stored) => setSession((stored[RECORDER_SESSION_KEY] as RecorderSession | undefined) ?? null))
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'session' || !(RECORDER_SESSION_KEY in changes)) return
      setSession((changes[RECORDER_SESSION_KEY].newValue as RecorderSession | undefined) ?? null)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  useEffect(() => {
    if (session?.phase !== 'recording') return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [session?.phase])

  return { session, elapsed: session ? elapsedMs(session, now) : 0 }
}

export async function microphonePermission(): Promise<PermissionState | 'unknown'> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return status.state
  } catch {
    return 'unknown'
  }
}
