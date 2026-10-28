import {
  clampCrawlOptions,
  DEFAULT_CRAWL_OPTIONS,
  parseExcludeList,
  type CrawlOptions,
  type CrawlScope,
  type RenderMode,
} from '@/core/engines/htmlArchive/crawl'
import { DEFAULT_MAX_PAGES, MAX_PAGES_CEILING } from '@/core/engines/htmlArchive'

export type LinkScanMode = 'page' | 'site'

export interface LinkCrawlSettings {
  mode: LinkScanMode
  scope: CrawlScope
  maxDepth: number
  maxPages: number
  concurrency: number
  render: RenderMode
  excludeText: string
}

export const DEFAULT_LINK_CRAWL_SETTINGS: LinkCrawlSettings = {
  mode: 'page',
  scope: 'site',
  maxDepth: DEFAULT_CRAWL_OPTIONS.maxDepth,
  maxPages: Math.min(150, DEFAULT_MAX_PAGES),
  concurrency: DEFAULT_CRAWL_OPTIONS.concurrency,
  render: DEFAULT_CRAWL_OPTIONS.render,
  excludeText: DEFAULT_CRAWL_OPTIONS.exclude.join(', '),
}

const SETTINGS_KEY = 'linkChecker.crawlSettings'

export async function loadLinkCrawlSettings(): Promise<LinkCrawlSettings> {
  const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as Partial<LinkCrawlSettings> | undefined
  if (!stored || typeof stored !== 'object') return DEFAULT_LINK_CRAWL_SETTINGS
  const merged = { ...DEFAULT_LINK_CRAWL_SETTINGS, ...stored }
  const clamped = clampCrawlOptions({ ...merged, maxPages: merged.maxPages, exclude: [] })
  const maxPages = Math.min(
    MAX_PAGES_CEILING,
    Math.max(1, Number.isFinite(Number(merged.maxPages)) ? Math.round(Number(merged.maxPages)) : DEFAULT_LINK_CRAWL_SETTINGS.maxPages),
  )
  return {
    mode: merged.mode === 'site' ? 'site' : 'page',
    scope: clamped.scope,
    maxDepth: clamped.maxDepth,
    maxPages,
    concurrency: clamped.concurrency,
    render: clamped.render,
    excludeText: typeof merged.excludeText === 'string' ? merged.excludeText : DEFAULT_LINK_CRAWL_SETTINGS.excludeText,
  }
}

export async function saveLinkCrawlSettings(settings: LinkCrawlSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export function toLinkCrawlOptions(settings: LinkCrawlSettings): CrawlOptions {
  return clampCrawlOptions({
    scope: settings.scope,
    maxDepth: settings.maxDepth,
    maxPages: settings.maxPages,
    concurrency: settings.concurrency,
    render: settings.render,
    exclude: parseExcludeList(settings.excludeText),
  })
}
