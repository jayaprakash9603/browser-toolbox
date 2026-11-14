import { attachCameraPreview, requestCameraStream } from '@/shared/media/requestCameraStream'
import { isExtensionMessage } from '@/core/messaging/types'

let stream: MediaStream | null = null
let video: HTMLVideoElement | null = null

function stopInternal(): void {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  video = null
}

async function startCamera(): Promise<void> {
  stopInternal()
  stream = await requestCameraStream()
  video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  await attachCameraPreview(video, stream)
}

function frameDataUrl(maxEdge = 960, quality = 0.72): string | null {
  if (!video?.videoWidth) return null
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight))
  const width = Math.round(video.videoWidth * scale)
  const height = Math.round(video.videoHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(video, 0, 0, width, height)
  const data = canvas.toDataURL('image/jpeg', quality)
  canvas.width = 0
  return data
}

function snapFull(quality = 0.92): string | null {
  if (!video?.videoWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(video, 0, 0)
  const data = canvas.toDataURL('image/jpeg', quality)
  canvas.width = 0
  return data
}

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  if (!isExtensionMessage(raw)) return false
  switch (raw.type) {
    case 'OFFSCREEN_CAMERA_START':
      void startCamera()
        .then(() => sendResponse({ ok: true, data: { active: true } }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      return true
    case 'OFFSCREEN_CAMERA_STOP':
      stopInternal()
      sendResponse({ ok: true, data: { active: false } })
      return false
    case 'OFFSCREEN_CAMERA_FRAME':
      sendResponse({ ok: true, data: { frame: frameDataUrl() } })
      return false
    case 'OFFSCREEN_CAMERA_SNAP':
      sendResponse({ ok: true, data: { frame: snapFull() } })
      return false
    default:
      return false
  }
})