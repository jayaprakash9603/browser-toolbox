import { DEFAULT_CRAWL_OPTIONS, parseExcludeList, type CrawlOptions } from '@/core/engines/htmlArchive/crawl'
import { DEFAULT_MAX_PAGES, MAX_PAGES_CEILING } from '@/core/engines/htmlArchive'
import { clampTimeout, DEFAULT_CHECK_TIMEOUT_MS } from '@/core/engines/linkChecker/check'
import { clampDiscoverOptions, DEFAULT_DISCOVER_CONCURRENCY } from '@/core/engines/linkChecker/discover'

export type IntelligenceScope = 'page' | 'site' | 'folder' | 'sitemap'

export interface IntelligenceSettings {
  scope: IntelligenceScope
  maxDepth: number
  maxPages: number
  concurrency: number
  excludeText: string
  includeText: string
  keepQuery: boolean
  respectRobots: boolean
  checkExternals: boolean
  timeoutMs: number
  animate: boolean
  showLabels: boolean
}

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceSettings = {
  scope: 'page',
  maxDepth: DEFAULT_CRAWL_OPTIONS.maxDepth,
  maxPages: Math.min(80, DEFAULT_MAX_PAGES),
  concurrency: DEFAULT_DISCOVER_CONCURRENCY,
  excludeText: DEFAULT_CRAWL_OPTIONS.exclude.join(', '),
  includeText: '',
  keepQuery: false,
  respectRobots: true,
  checkExternals: false,
  timeoutMs: DEFAULT_CHECK_TIMEOUT_MS,
  animate: true,
  showLabels: true,
}

const SETTINGS_KEY = 'linkToolkit.intelligence'

export async function loadIntelligenceSettings(): Promise<IntelligenceSettings> {
  const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] as Partial<IntelligenceSettings> | undefined
  if (!stored || typeof stored !== 'object') return DEFAULT_INTELLIGENCE_SETTINGS
  return normalizeIntelligenceSettings({ ...DEFAULT_INTELLIGENCE_SETTINGS, ...stored })
}

export async function saveIntelligenceSettings(settings: IntelligenceSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export function normalizeIntelligenceSettings(value: IntelligenceSettings): IntelligenceSettings {
  const maxPages = Math.min(
    MAX_PAGES_CEILING,
    Math.max(1, Number.isFinite(value.maxPages) ? Math.round(value.maxPages) : DEFAULT_INTELLIGENCE_SETTINGS.maxPages),
  )
  const clamped = clampDiscoverOptions({
    scope: value.scope === 'folder' ? 'folder' : 'site',
    maxDepth: value.maxDepth,
    maxPages,
    concurrency: value.concurrency,
    exclude: parseExcludeList(value.excludeText),
  })
  return {
    scope: value.scope,
    maxDepth: clamped.maxDepth,
    maxPages,
    concurrency: clamped.concurrency,
    excludeText: value.excludeText,
    includeText: value.includeText,
    keepQuery: value.keepQuery === true,
    respectRobots: value.respectRobots !== false,
    checkExternals: value.checkExternals === true,
    timeoutMs: clampTimeout(value.timeoutMs),
    animate: value.animate !== false,
    showLabels: value.showLabels !== false,
  }
}

export function toDiscoverOptions(settings: IntelligenceSettings): CrawlOptions & {
  recordGraph: true
  keepQuery: boolean
  respectRobots: boolean
  sitemapOnly: boolean
  include: string[]
} {
  const clamped = clampDiscoverOptions({
    scope: settings.scope === 'folder' ? 'folder' : 'site',
    maxDepth: settings.maxDepth,
    maxPages: settings.maxPages,
    concurrency: settings.concurrency,
    exclude: parseExcludeList(settings.excludeText),
  })
  return {
    ...clamped,
    recordGraph: true,
    keepQuery: settings.keepQuery,
    respectRobots: settings.respectRobots,
    sitemapOnly: settings.scope === 'sitemap',
    include: parseExcludeList(settings.includeText),
  }
}
