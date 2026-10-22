import { videoConstraints } from '@/core/recorder/settings'
import type { RecorderSettings } from '@/core/recorder/types'
import { isExtensionMessage } from '@/core/messaging/types'
import { startRecording, type ActiveRecording } from '@/features/recorder/engine'

const HEARTBEAT_MS = 1000

let active: { id: string; recording: ActiveRecording; heartbeat: ReturnType<typeof setInterval> } | null = null

function send(message: Record<string, unknown>): void {
  void chrome.runtime.sendMessage(message).catch(() => undefined)
}

async function captureTab(streamId: string, settings: RecorderSettings): Promise<MediaStream> {
  const { width, height } = videoConstraints(settings.quality)
  const mandatory = { chromeMediaSource: 'tab', chromeMediaSourceId: streamId }
  return navigator.mediaDevices.getUserMedia({
    audio: settings.tabAudio ? ({ mandatory } as MediaTrackConstraints) : false,
    video: { mandatory: { ...mandatory, maxWidth: width, maxHeight: height, maxFrameRate: 30 } } as MediaTrackConstraints,
  })
}

async function captureMic(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch {
    return null
  }
}

async function finish(id: string, error?: string): Promise<void> {
  if (!active || active.id !== id) return
  const { recording, heartbeat } = active
  clearInterval(heartbeat)
  active = null
  try {
    await recording.stop()
    send({ type: 'RECORDER_FINISHED', id, error })
  } catch (e) {
    send({ type: 'RECORDER_FINISHED', id, error: e instanceof Error ? e.message : String(e) })
  }
}

async function start(id: string, streamId: string, settings: RecorderSettings, delayMs = 0): Promise<void> {
  if (active) throw new Error('A recording is already running.')
  const video = await captureTab(streamId, settings)
  const mic = settings.mic ? await captureMic() : null
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
  const recording = startRecording({
    id,
    source: 'tab',
    video,
    extraAudio: mic ? [mic] : [],
    monitorAudio: settings.tabAudio,
    onEnded: () => void finish(id),
  })
  const heartbeat = setInterval(() => send({ type: 'RECORDER_HEARTBEAT', id }), HEARTBEAT_MS)
  active = { id, recording, heartbeat }
  send({ type: 'RECORDER_STARTED', id })
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false
  if (raw.type === 'OFFSCREEN_RECORDER_START') {
    start(raw.id, raw.streamId, raw.settings, raw.delayMs)
      .then(() => sendResponse({ ok: true, data: { started: true } }))
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      )
    return true
  }
  if (raw.type === 'RECORDER_CONTROL' && active?.id === raw.id) {
    if (raw.action === 'pause') active.recording.pause()
    else if (raw.action === 'resume') active.recording.resume()
    else void finish(raw.id)
    return false
  }
  return false
})
