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

export interface CaptureSlice {
  dataUrl: string
  scrollY: number
}

export interface ScreenshotFrame {
  dataUrl?: string
  slices?: CaptureSlice[]
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
