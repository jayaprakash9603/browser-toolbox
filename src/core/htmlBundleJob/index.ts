import type { CrawlOptions, CrawlProgress, CrawlSummary } from '@/core/engines/htmlArchive/crawl'

export type BundlePhase = 'crawl' | 'pages' | 'assets' | 'zip' | 'transfer'

/** `links` saves the pages picked from the list; `crawl` follows links across the site. */
export type BundleMode = 'links' | 'crawl'

export interface BundleProgressEvent {
  phase: BundlePhase
  done: number
  total: number
  crawl?: CrawlProgress
}

export interface BundleStats {
  pages: number
  assets: number
  bytes: number
  missing: number
  crawl?: CrawlSummary
}

export type HtmlBundleJobStatus = 'running' | 'done' | 'error' | 'cancelled'

export interface HtmlBundleJob {
  id: string
  tabId: number
  pageUrl: string
  pageTitle: string
  fileName: string
  pageCount: number
  mode?: BundleMode
  /** The user asked a crawl to stop early; the ZIP is built from the pages saved so far. */
  stopRequested?: boolean
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
  /** Present only in crawl mode; the selected URLs are then ignored. */
  crawl?: CrawlOptions
}

export const HTML_BUNDLE_JOB_KEY = 'htmlBundle.job'
export const STALE_AFTER_MS = 3 * 60 * 1000

interface PhaseSpan {
  id: BundlePhase
  label: string
  start: number
  end: number
}

export const BUNDLE_PHASES: PhaseSpan[] = [
  { id: 'pages', label: 'htmlBundle.phasePages', start: 0, end: 45 },
  { id: 'assets', label: 'htmlBundle.phaseAssets', start: 45, end: 85 },
  { id: 'zip', label: 'htmlBundle.phaseZip', start: 85, end: 93 },
  { id: 'transfer', label: 'htmlBundle.phaseTransfer', start: 93, end: 100 },
]

export const CRAWL_PHASES: PhaseSpan[] = [
  { id: 'crawl', label: 'htmlBundle.crawl.phaseCrawl', start: 0, end: 60 },
  { id: 'assets', label: 'htmlBundle.phaseAssets', start: 60, end: 88 },
  { id: 'zip', label: 'htmlBundle.phaseZip', start: 88, end: 94 },
  { id: 'transfer', label: 'htmlBundle.phaseTransfer', start: 94, end: 100 },
]

export function phasesFor(mode: BundleMode | undefined): PhaseSpan[] {
  return mode === 'crawl' ? CRAWL_PHASES : BUNDLE_PHASES
}

export function overallPercent(progress: BundleProgressEvent | null, mode?: BundleMode): number {
  if (!progress) return 0
  const phases = phasesFor(mode ?? (progress.phase === 'crawl' ? 'crawl' : 'links'))
  const phase = phases.find((item) => item.id === progress.phase) ?? phases[0]
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
