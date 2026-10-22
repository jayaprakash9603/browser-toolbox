import { defaultRecordingName } from '@/core/recorder/format'
import { pickMimeType } from '@/core/recorder/mime'
import { appendChunk, notifyRecordingsChanged, saveMeta } from '@/core/recorder/store'
import type { RecordingMeta, RecordingSource } from '@/core/recorder/types'

const TIMESLICE_MS = 1000

export interface ActiveRecording {
  pause(): void
  resume(): void
  stop(): Promise<RecordingMeta>
}

export interface StartRecordingOptions {
  id: string
  source: RecordingSource
  video: MediaStream
  /** Extra audio inputs (microphone) mixed into the recording. */
  extraAudio?: MediaStream[]
  /** Route the captured audio back to the speakers (tab capture mutes the tab otherwise). */
  monitorAudio?: boolean
  onEnded?: () => void
}

function mixAudio(
  sources: MediaStream[],
  monitor: MediaStream | null,
): { track: MediaStreamTrack | null; close: () => void } {
  const withAudio = sources.filter((s) => s.getAudioTracks().length > 0)
  if (!withAudio.length) return { track: null, close: () => undefined }
  const ctx = new AudioContext()
  const dest = ctx.createMediaStreamDestination()
  for (const stream of withAudio) {
    const node = ctx.createMediaStreamSource(stream)
    node.connect(dest)
    if (stream === monitor) node.connect(ctx.destination)
  }
  return { track: dest.stream.getAudioTracks()[0] ?? null, close: () => void ctx.close() }
}

type Snapshot = { thumbnail?: string; width?: number; height?: number }

type ImageCaptureCtor = new (track: MediaStreamTrack) => { grabFrame(): Promise<ImageBitmap> }

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Grabs a frame from the live track, so Stop never has to decode the finished file. */
async function snapshotTrack(track: MediaStreamTrack | undefined): Promise<Snapshot> {
  if (!track) return {}
  const { width, height } = track.getSettings()
  const Capture = (globalThis as { ImageCapture?: ImageCaptureCtor }).ImageCapture
  if (!Capture || typeof OffscreenCanvas === 'undefined' || track.readyState !== 'live') return { width, height }
  try {
    const bitmap = await new Capture(track).grabFrame()
    const scale = Math.min(1, 320 / Math.max(1, bitmap.width))
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
    return { thumbnail: await blobToDataUrl(blob), ...size }
  } catch {
    return { width, height }
  }
}

const THUMBNAIL_DELAY_MS = 1000
const STOP_SNAPSHOT_TIMEOUT_MS = 500

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
}

export function startRecording(options: StartRecordingOptions): ActiveRecording {
  const { id, source, video, extraAudio = [], monitorAudio = false, onEnded } = options
  const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t))
  const audio = mixAudio([video, ...extraAudio], monitorAudio ? video : null)
  const tracks = [...video.getVideoTracks(), ...(audio.track ? [audio.track] : [])]
  const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType })

  const createdAt = Date.now()
  let seq = 0
  let size = 0
  let writes: Promise<void> = Promise.resolve()
  let segmentStart = createdAt
  let accumulated = 0
  let stopping: Promise<RecordingMeta> | null = null
  const videoTrack = video.getVideoTracks()[0]
  let snapshot: Promise<Snapshot> | null = null
  const snapshotTimer = setTimeout(() => {
    snapshot ??= snapshotTrack(videoTrack)
  }, THUMBNAIL_DELAY_MS)

  recorder.ondataavailable = (event) => {
    if (!event.data.size) return
    const chunk = event.data
    const index = seq++
    size += chunk.size
    writes = writes.then(() => appendChunk(id, index, chunk))
  }

  const stopTracks = () => {
    for (const stream of [video, ...extraAudio]) stream.getTracks().forEach((t) => t.stop())
    audio.close()
  }

  const handle: ActiveRecording = {
    pause() {
      if (recorder.state !== 'recording') return
      recorder.pause()
      accumulated += Date.now() - segmentStart
    },
    resume() {
      if (recorder.state !== 'paused') return
      recorder.resume()
      segmentStart = Date.now()
    },
    stop() {
      if (stopping) return stopping
      clearTimeout(snapshotTimer)
      // Very short recordings: grab the frame now, while the track is still live.
      const frame = withTimeout((snapshot ??= snapshotTrack(videoTrack)), STOP_SNAPSHOT_TIMEOUT_MS, {})
      stopping = new Promise<void>((resolve) => {
        if (recorder.state === 'inactive') {
          resolve()
          return
        }
        if (recorder.state === 'recording') accumulated += Date.now() - segmentStart
        recorder.onstop = () => resolve()
        recorder.stop()
      }).then(async () => {
        stopTracks()
        await writes
        const meta: RecordingMeta = {
          id,
          name: defaultRecordingName(createdAt),
          mimeType,
          source,
          createdAt,
          durationMs: accumulated,
          size,
          ...(await frame),
        }
        await saveMeta(meta)
        notifyRecordingsChanged()
        return meta
      })
      return stopping
    },
  }

  video.getVideoTracks()[0]?.addEventListener('ended', () => {
    void handle.stop().finally(() => onEnded?.())
  })

  recorder.start(TIMESLICE_MS)
  return handle
}
