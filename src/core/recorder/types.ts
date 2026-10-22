export type RecordingSource = 'tab' | 'window' | 'screen'

export type RecorderQuality = '720p' | '1080p'

export interface RecorderSettings {
  mic: boolean
  tabAudio: boolean
  countdown: boolean
  quality: RecorderQuality
}

/** Tab capture runs in the offscreen document; window/screen capture in a pinned recorder tab. */
export type RecorderHost = 'offscreen' | 'page'

export type RecorderPhase = 'pending' | 'recording' | 'paused'

export interface RecorderSession {
  id: string
  source: RecordingSource
  host: RecorderHost
  phase: RecorderPhase
  createdAt: number
  /** Wall-clock time the current recording segment started; 0 while pending. */
  startedAt: number
  /** Total paused milliseconds before the current pause (if any). */
  pausedMs: number
  pausedAt: number
  tabId?: number
  windowId?: number
  /** Recorder tab that owns the stream when host is 'page'. */
  pageTabId?: number
  /** Tab to bring back once the recorder tab has the stream. */
  returnTabId?: number
}

export interface RecordingMeta {
  id: string
  name: string
  mimeType: string
  source: RecordingSource
  createdAt: number
  durationMs: number
  size: number
  thumbnail?: string
  width?: number
  height?: number
}
