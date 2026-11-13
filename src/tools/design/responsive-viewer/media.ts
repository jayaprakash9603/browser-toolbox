import { captureVisibleTab } from '@/core/engines/capture'
import { downloadBlobInExtension, exportCanvas, type ImageFormat } from '@/core/screenshot/export'
import { pickMimeType } from '@/core/recorder/mime'
import { sendMessage } from '@/core/messaging'
import type { RecorderSettings } from '@/core/recorder/types'

export type CaptureTarget = 'selected' | 'all' | 'canvas'

export interface CaptureOptions {
  format: ImageFormat
  scale: 1 | 2 | 3
  transparent: boolean
  background?: string
  includeLabel?: boolean
  label?: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read the capture.'))
    image.src = src
  })
}

function cropCanvas(
  source: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  dpr: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(crop.width * dpr))
  canvas.height = Math.max(1, Math.round(crop.height * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(
    source,
    Math.round(crop.x * dpr),
    Math.round(crop.y * dpr),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  return canvas
}

function chromaKey(canvas: HTMLCanvasElement, key: [number, number, number], tolerance = 28) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (
      Math.abs(data[i] - key[0]) < tolerance &&
      Math.abs(data[i + 1] - key[1]) < tolerance &&
      Math.abs(data[i + 2] - key[2]) < tolerance
    ) {
      data[i + 3] = 0
    }
  }
  ctx.putImageData(image, 0, 0)
}

export async function captureElements(
  elements: HTMLElement[],
  options: CaptureOptions,
): Promise<Blob> {
  const shot = await captureVisibleTab()
  if (!shot.ok) throw new Error(shot.error)
  const image = await loadImage(shot.value.dataUrl)
  const dpr = window.devicePixelRatio || 1
  const pads = elements.map((element) => element.getBoundingClientRect())
  if (pads.length === 0) throw new Error('Nothing to capture.')

  const left = Math.min(...pads.map((box) => box.left))
  const top = Math.min(...pads.map((box) => box.top))
  const right = Math.max(...pads.map((box) => box.right))
  const bottom = Math.max(...pads.map((box) => box.bottom))
  const canvas = cropCanvas(image, { x: left, y: top, width: right - left, height: bottom - top }, dpr)

  if (options.transparent) chromaKey(canvas, [7, 8, 10])
  else if (options.background) {
    const layered = document.createElement('canvas')
    layered.width = canvas.width
    layered.height = canvas.height
    const ctx = layered.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, layered.width, layered.height)
    ctx.drawImage(canvas, 0, 0)
    return exportCanvas(layered, options.format)
  }

  if (options.scale !== 1) {
    const scaled = document.createElement('canvas')
    scaled.width = canvas.width * options.scale
    scaled.height = canvas.height * options.scale
    const ctx = scaled.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height)
    if (options.includeLabel && options.label) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.font = `${14 * options.scale}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillStyle = '#fff'
      ctx.fillText(options.label, 16 * options.scale, scaled.height - 16 * options.scale)
    }
    return exportCanvas(scaled, options.format)
  }

  if (options.includeLabel && options.label) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.fillText(options.label, 12, canvas.height - 12)
    }
  }
  return exportCanvas(canvas, options.format)
}

export async function downloadCapture(blob: Blob, filename: string) {
  if (typeof chrome !== 'undefined' && chrome.downloads) {
    await downloadBlobInExtension(blob, filename, { saveAs: true })
    return
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function supportedRecorderMime(): { mime: string; ext: 'webm' | 'mp4' } {
  const mime = pickMimeType((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type))
  return { mime, ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' }
}

export async function startStudioRecording(settings: RecorderSettings) {
  return sendMessage<{ session: import('@/core/recorder/types').RecorderSession }>({
    type: 'RECORDER_START',
    source: 'tab',
    settings,
  })
}

export async function pauseStudioRecording() {
  return sendMessage({ type: 'RECORDER_PAUSE' })
}

export async function resumeStudioRecording() {
  return sendMessage({ type: 'RECORDER_RESUME' })
}

export async function stopStudioRecording() {
  return sendMessage({ type: 'RECORDER_STOP' })
}

/** Short local GIF of the visible studio, capped so encoding stays on-device. */
export async function captureGifBurst(element: HTMLElement, frames = 24, delayMs = 120): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const encoder = GIFEncoder()
  for (let i = 0; i < frames; i += 1) {
    const shot = await captureVisibleTab()
    if (!shot.ok) throw new Error(shot.error)
    const image = await loadImage(shot.value.dataUrl)
    const box = element.getBoundingClientRect()
    const canvas = cropCanvas(image, box, window.devicePixelRatio || 1)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const palette = quantize(data.data, 256)
    const index = applyPalette(data.data, palette)
    encoder.writeFrame(index, canvas.width, canvas.height, { palette })
    await new Promise((resolve) => window.setTimeout(resolve, delayMs))
  }
  encoder.finish()
  return new Blob([new Uint8Array(encoder.bytes())], { type: 'image/gif' })
}
