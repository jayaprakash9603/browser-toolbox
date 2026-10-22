export type RecordingSource = 'tab' | 'window' | 'screen'

export type RecorderQuality = '720p' | '1080p'

export interface RecorderSettings {
  mic: boolean
  tabAudio: boolean
  countdown: boolean
  quality: RecorderQuality
}

export type RecorderHost = 'offscreen' | 'window'

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
