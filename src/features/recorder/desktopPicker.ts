import type { RecordingSource } from '@/core/recorder/types'

export interface DesktopPick {
  streamId: string
  /** True when the user left "Share audio" on in Chrome's picker. */
  audio: boolean
}

const SOURCES: Record<RecordingSource, `${chrome.desktopCapture.DesktopCaptureSourceType}`[]> = {
  tab: ['tab', 'audio'],
  window: ['window', 'audio'],
  screen: ['screen', 'audio'],
}

/**
 * Opens Chrome's native "Choose what to share" dialog. Resolves null when the user cancels.
 * Only the calling document may pass the stream ID to getUserMedia.
 */
export function chooseDesktopSource(source: RecordingSource): Promise<DesktopPick | null> {
  return new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(SOURCES[source], (streamId, options) => {
      resolve(streamId ? { streamId, audio: Boolean(options?.canRequestAudioTrack) } : null)
    })
  })
}
