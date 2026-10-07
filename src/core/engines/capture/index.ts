export type CaptureMode = 'visible' | 'area' | 'element'

export interface CaptureResult {
  dataUrl: string
  width: number
  height: number
}

export type CaptureOutcome = { ok: true; value: CaptureResult } | { ok: false; error: string }

export async function captureVisibleTab(windowId?: number): Promise<CaptureOutcome> {
  try {
    const dataUrl = windowId === undefined
      ? await chrome.tabs.captureVisibleTab({ format: 'png' })
      : await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
    const dimensions = await imageDimensions(dataUrl)
    return { ok: true, value: { dataUrl, ...dimensions } }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not capture the tab.' }
  }
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read the captured image.'))
    img.src = dataUrl
  })
}

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export async function cropCapture(dataUrl: string, region: CropRegion, devicePixelRatio = 1): Promise<CaptureOutcome> {
  try {
    const img = await loadImage(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(region.width * devicePixelRatio)
    canvas.height = Math.round(region.height * devicePixelRatio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, error: 'Canvas is unavailable.' }
    ctx.drawImage(
      img,
      region.x * devicePixelRatio,
      region.y * devicePixelRatio,
      region.width * devicePixelRatio,
      region.height * devicePixelRatio,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    return { ok: true, value: { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height } }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Crop failed.' }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load.'))
    img.src = src
  })
}

export type AnnotationTool = 'arrow' | 'rect' | 'circle' | 'text' | 'highlight' | 'blur' | 'marker'

export interface Annotation {
  tool: AnnotationTool
  color: string
  x1: number
  y1: number
  x2: number
  y2: number
  text?: string
  number?: number
}

export function drawAnnotations(canvas: HTMLCanvasElement, annotations: Annotation[]): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  for (const note of annotations) {
    ctx.strokeStyle = note.color
    ctx.fillStyle = note.color
    ctx.lineWidth = 2.5
    const { x1, y1, x2, y2 } = note
    switch (note.tool) {
      case 'rect':
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
        break
      case 'circle':
        ctx.beginPath()
        ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'arrow': {
        const headLength = 12
        const angle = Math.atan2(y2 - y1, x2 - x1)
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6))
        ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6))
        ctx.stroke()
        break
      }
      case 'highlight':
        ctx.save()
        ctx.globalAlpha = 0.3
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
        ctx.restore()
        break
      case 'blur':
      case 'marker':
        ctx.save()
        ctx.filter = 'blur(6px)'
        ctx.drawImage(canvas, x1, y1, x2 - x1, y2 - y1, x1, y1, x2 - x1, y2 - y1)
        ctx.restore()
        if (note.tool === 'marker' && note.number !== undefined) {
          ctx.beginPath()
          ctx.arc(x1, y1, 11, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 12px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(note.number), x1, y1)
        }
        break
      case 'text':
        ctx.font = '14px sans-serif'
        ctx.fillText(note.text ?? '', x1, y1)
        break
    }
  }
}

export async function renderAnnotated(dataUrl: string, annotations: Annotation[]): Promise<CaptureOutcome> {
  try {
    const img = await loadImage(dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, error: 'Canvas is unavailable.' }
    ctx.drawImage(img, 0, 0)
    drawAnnotations(canvas, annotations)
    return { ok: true, value: { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height } }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not render annotations.' }
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}
