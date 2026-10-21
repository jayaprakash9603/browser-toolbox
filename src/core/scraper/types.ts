export type ScrapeColumnAttr = 'text' | 'href' | 'src'

export interface ScrapeColumn {
  key: string
  label: string
  /** CSS selector relative to each row element */
  relativeSelector: string
  attr: ScrapeColumnAttr
  hidden?: boolean
  order?: number
}

export type ScrapePaginationMode = 'click' | 'scroll' | 'none'

export interface ScrapeConfig {
  rowSelector: string
  columns: ScrapeColumn[]
  nextSelector?: string
  mode: ScrapePaginationMode
  delayMinMs: number
  delayMaxMs: number
  maxWaitMs: number
  maxPages: number
}

export const DEFAULT_SCRAPE_CONFIG: Omit<ScrapeConfig, 'rowSelector' | 'columns'> = {
  mode: 'none',
  delayMinMs: 1500,
  delayMaxMs: 3500,
  maxWaitMs: 20000,
  maxPages: 50,
}

export type ScrapeRow = Record<string, string>

export type ScrapeJobPhase =
  | 'idle'
  | 'extracting'
  | 'waiting'
  | 'paginating'
  | 'done'
  | 'stopped'
  | 'error'

export interface ScrapeJobState {
  tabId: number
  phase: ScrapeJobPhase
  pages: number
  rowCount: number
  rows: ScrapeRow[]
  error?: string
  warning?: string
  config: ScrapeConfig
  startedAt: number
  updatedAt: number
}

export interface DetectCandidate {
  rowSelector: string
  containerSelector: string
  score: number
  rowCount: number
  sampleColumns: ScrapeColumn[]
}

export type ScraperPickMode = 'row' | 'column' | 'next'

export interface ScraperPickResult {
  mode: ScraperPickMode
  selector: string
  rowSelector?: string
  matchCount?: number
  at: number
}
