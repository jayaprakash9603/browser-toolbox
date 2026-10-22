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

async function thumbnailFor(blob: Blob): Promise<{ thumbnail?: string; width?: number; height?: number }> {
  if (typeof document === 'undefined') return {}
  const url = URL.createObjectURL(blob)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('thumbnail timeout')), 4000)
      video.onloadeddata = () => {
        clearTimeout(timer)
        resolve()
      }
      video.onerror = () => {
        clearTimeout(timer)
        reject(new Error('thumbnail decode failed'))
      }
    })
    const width = video.videoWidth
    const height = video.videoHeight
    const scale = Math.min(1, 320 / Math.max(1, width))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    return { thumbnail: canvas.toDataURL('image/jpeg', 0.7), width, height }
  } catch {
    return {}
  } finally {
    URL.revokeObjectURL(url)
  }
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
      stopping ??= new Promise<void>((resolve) => {
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
        const { getRecordingBlob } = await import('@/core/recorder/store')
        const blob = await getRecordingBlob(id, mimeType)
        const meta: RecordingMeta = {
          id,
          name: defaultRecordingName(createdAt),
          mimeType,
          source,
          createdAt,
          durationMs: accumulated,
          size,
          ...(await thumbnailFor(blob)),
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
