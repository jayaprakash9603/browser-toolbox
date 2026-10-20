export type SeoSeverity = 'error' | 'warning' | 'notice' | 'ok'

export type SeoCategory =
  | 'overview'
  | 'head'
  | 'content'
  | 'headings'
  | 'links'
  | 'images'
  | 'structured'
  | 'social'
  | 'hreflang'
  | 'performance'

export interface SeoCheck {
  id: string
  category: SeoCategory
  ok: boolean
  severity: SeoSeverity
  weight: number
  message: string
  fix?: string
  tab?: string
  details?: string
}

export interface SeoLinkRow {
  href: string
  text: string
  internal: boolean
  subdomain: boolean
  nofollow: boolean
  sponsored: boolean
  ugc: boolean
  targetBlank: boolean
  rel: string
  index: number
}

export interface SeoImageRow {
  src: string
  alt: string | null
  title: string | null
  width: number
  height: number
  hasWidthAttr: boolean
  hasHeightAttr: boolean
  loading: string | null
  index: number
}

export interface SeoHeadingRow {
  level: number
  text: string
  index: number
}

export interface HreflangRow {
  href: string
  hreflang: string
}

export interface JsonLdBlock {
  raw: string
  parsed: unknown | null
  error?: string
}

export interface SeoPageData {
  url: string
  title: string
  metaDescription: string | null
  metaRobots: string | null
  metaKeywords: string | null
  canonical: string | null
  language: string
  charset: string
  viewport: string | null
  openGraph: Record<string, string>
  twitter: Record<string, string>
  links: SeoLinkRow[]
  images: SeoImageRow[]
  headings: SeoHeadingRow[]
  hreflangs: HreflangRow[]
  jsonLd: JsonLdBlock[]
  microdataItemCount: number
  rdfaCount: number
  favicon: string | null
  appleTouchIcon: string | null
  themeColor: string | null
  manifest: string | null
  doctype: string
  metaRefresh: string | null
  ampHtml: string | null
  paginationPrev: string | null
  paginationNext: string | null
  scriptCount: number
  stylesheetCount: number
  inlineStyleBytes: number
  iframeCount: number
  embedCount: number
  objectCount: number
  renderBlockingScriptsInHead: number
  htmlBytes: number
  bodyText: string
  wordCount: number
  charCount: number
  performance: {
    domContentLoaded: number | null
    loadEvent: number | null
    ttfb: number | null
  }
}

export interface SeoNetworkContext {
  statusCode: number | null
  finalUrl: string
  redirectCount: number
  xRobotsTag: string | null
  contentType: string | null
  contentLength: number | null
  contentEncoding: string | null
  cacheControl: string | null
  robotsTxt: string | null
  robotsAllowsUrl: boolean | null
  robotsSitemaps: string[]
  sitemapContainsUrl: boolean | null
  llmsTxt: string | null
}

export interface SeoReport {
  score: number
  checks: SeoCheck[]
  page: SeoPageData
  network: SeoNetworkContext
  byCategory: Record<SeoCategory, { passed: number; total: number; score: number }>
}

export type SeoHighlightKind =
  | 'headings'
  | 'links-internal'
  | 'links-external'
  | 'links-nofollow'
  | 'images-missing-alt'
  | 'images-all'
  | 'hreflang'
