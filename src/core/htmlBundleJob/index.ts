export type BundlePhase = 'pages' | 'assets' | 'zip' | 'transfer'

export interface BundleProgressEvent {
  phase: BundlePhase
  done: number
  total: number
}

export interface BundleStats {
  pages: number
  assets: number
  bytes: number
  missing: number
}

export type HtmlBundleJobStatus = 'running' | 'done' | 'error' | 'cancelled'

export interface HtmlBundleJob {
  id: string
  tabId: number
  pageUrl: string
  pageTitle: string
  fileName: string
  pageCount: number
  status: HtmlBundleJobStatus
  progress: BundleProgressEvent | null
  startedAt: number
  updatedAt: number
  finishedAt?: number
  stats?: BundleStats
  error?: string
}

export interface HtmlBundleJobRequest {
  includeCurrent: boolean
  selectedResolvedUrls: string[]
  includeAssets: boolean
  maxPages: number
}

export const HTML_BUNDLE_JOB_KEY = 'htmlBundle.job'
export const STALE_AFTER_MS = 3 * 60 * 1000

export const BUNDLE_PHASES: { id: BundlePhase; label: string; start: number; end: number }[] = [
  { id: 'pages', label: 'htmlBundle.phasePages', start: 0, end: 45 },
  { id: 'assets', label: 'htmlBundle.phaseAssets', start: 45, end: 85 },
  { id: 'zip', label: 'htmlBundle.phaseZip', start: 85, end: 93 },
  { id: 'transfer', label: 'htmlBundle.phaseTransfer', start: 93, end: 100 },
]

export function overallPercent(progress: BundleProgressEvent | null): number {
  if (!progress) return 0
  const phase = BUNDLE_PHASES.find((item) => item.id === progress.phase) ?? BUNDLE_PHASES[0]
  const ratio = progress.total > 0 ? Math.min(progress.done / progress.total, 1) : 0
  return Math.round(phase.start + (phase.end - phase.start) * ratio)
}

export function isJobRunning(job: HtmlBundleJob | null, now = Date.now()): boolean {
  return job?.status === 'running' && now - job.updatedAt < STALE_AFTER_MS
}

export function isJobStalled(job: HtmlBundleJob | null, now = Date.now()): boolean {
  return job?.status === 'running' && now - job.updatedAt >= STALE_AFTER_MS
}

export async function readHtmlBundleJob(): Promise<HtmlBundleJob | null> {
  if (!chrome.storage?.session) return null
  const stored = await chrome.storage.session.get(HTML_BUNDLE_JOB_KEY)
  return (stored[HTML_BUNDLE_JOB_KEY] as HtmlBundleJob | undefined) ?? null
}

export async function clearHtmlBundleJob(): Promise<void> {
  await chrome.storage.session?.remove(HTML_BUNDLE_JOB_KEY)
}
