import {
  clampCrawlOptions,
  DEFAULT_CRAWL_OPTIONS,
  parseExcludeList,
  type CrawlOptions,
  type CrawlScope,
  type RenderMode,
} from '@/core/engines/htmlArchive/crawl'
import type { BundleMode } from '@/core/htmlBundleJob'
import type { ExtensionResponse } from '@/core/messaging/types'

export interface CrawlSettings {
  mode: BundleMode
  scope: CrawlScope
  maxDepth: number
  concurrency: number
  render: RenderMode
  includeAssets: boolean
  /** Kept as typed so commas and spaces survive editing. */
  excludeText: string
}

export const DEFAULT_CRAWL_SETTINGS: CrawlSettings = {
  mode: 'links',
  scope: DEFAULT_CRAWL_OPTIONS.scope,
  maxDepth: DEFAULT_CRAWL_OPTIONS.maxDepth,
  concurrency: DEFAULT_CRAWL_OPTIONS.concurrency,
  render: DEFAULT_CRAWL_OPTIONS.render,
  includeAssets: true,
  excludeText: DEFAULT_CRAWL_OPTIONS.exclude.join(', '),
}

const SETTINGS_KEY = 'htmlBundle.crawlSettings'

export async function loadCrawlSettings(): Promise<CrawlSettings> {
  const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as Partial<CrawlSettings> | undefined
  if (!stored || typeof stored !== 'object') return DEFAULT_CRAWL_SETTINGS
  const merged = { ...DEFAULT_CRAWL_SETTINGS, ...stored }
  const clamped = clampCrawlOptions({ ...merged, exclude: [] })
  return {
    mode: merged.mode === 'crawl' ? 'crawl' : 'links',
    scope: clamped.scope,
    maxDepth: clamped.maxDepth,
    concurrency: clamped.concurrency,
    render: clamped.render,
    includeAssets: merged.includeAssets !== false,
    excludeText: typeof merged.excludeText === 'string' ? merged.excludeText : DEFAULT_CRAWL_SETTINGS.excludeText,
  }
}

export async function saveCrawlSettings(settings: CrawlSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export function toCrawlOptions(settings: CrawlSettings, maxPages: number): CrawlOptions {
  return clampCrawlOptions({
    scope: settings.scope,
    maxDepth: settings.maxDepth,
    maxPages,
    concurrency: settings.concurrency,
    render: settings.render,
    exclude: parseExcludeList(settings.excludeText),
  })
}

export async function stopHtmlBundleCrawl(jobId: string): Promise<void> {
  const response = (await chrome.runtime.sendMessage({ type: 'STOP_HTML_BUNDLE_JOB', jobId })) as
    | ExtensionResponse<unknown>
    | undefined
  if (response && !response.ok) throw new Error(response.error)
}
