export type ScreenshotMode =
  | 'visible'
  | 'entire'
  | 'selection'
  | 'element'
  | 'all-tabs'
  | 'batch-urls'

export interface PageInfo {
  url: string
  title: string
  domain: string
  capturedAt: number
}

export interface LinkRect {
  href: string
  x: number
  y: number
  width: number
  height: number
}

export interface TextRun {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}

export interface CaptureRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * One captureVisibleTab image. `scrollX`/`scrollY` are the content offsets that were actually
 * reached; `view` is where the scrolled content sits in the screenshot (CSS px), defaulting to
 * the whole image.
 */
export interface CaptureSlice {
  dataUrl: string
  scrollY: number
  scrollX?: number
  view?: CaptureRect
}

export interface ScreenshotFrame {
  dataUrl?: string
  slices?: CaptureSlice[]
  /** Content-space rectangle (CSS px) the slices are stitched into. */
  region?: CaptureRect
  stitchHeight?: number
  devicePixelRatio?: number
  width?: number
  height?: number
  pageInfo?: PageInfo
  links?: LinkRect[]
  textRuns?: TextRun[]
  notice?: string
  label?: string
}

export interface ScreenshotSession {
  id: string
  createdAt: number
  mode: ScreenshotMode
  frames: ScreenshotFrame[]
}

export interface ScreenshotProgress {
  sessionId?: string
  phase: string
  current: number
  total: number
}
