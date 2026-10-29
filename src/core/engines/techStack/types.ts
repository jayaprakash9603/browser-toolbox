export type TechCategoryId =
  | 'analytics'
  | 'tag-manager'
  | 'advertising'
  | 'marketing'
  | 'ab-testing'
  | 'rum'
  | 'error-tracking'
  | 'js-framework'
  | 'web-framework'
  | 'ui-framework'
  | 'js-library'
  | 'ssg'
  | 'build-tool'
  | 'cms'
  | 'page-builder'
  | 'cms-plugin'
  | 'ecommerce'
  | 'payment'
  | 'live-chat'
  | 'crm'
  | 'web-server'
  | 'programming-language'
  | 'database'
  | 'os'
  | 'hosting'
  | 'cdn'
  | 'caching'
  | 'asset-management'
  | 'security'
  | 'cookie-compliance'
  | 'authentication'
  | 'backend'
  | 'search'
  | 'font'
  | 'maps'
  | 'video'
  | 'widget'
  | 'comments'
  | 'documentation'
  | 'performance'
  | 'misc'

export interface TechRule {
  name: string
  category: TechCategoryId
  website?: string
  implies?: string[]
  /** Regex sources tested against script, stylesheet, iframe and image URLs. */
  src?: string[]
  /** Regex sources tested against inline script text. */
  inline?: string[]
  /** Regex sources tested against the page HTML. */
  html?: string[]
  /** Meta tag name or property to a regex source; an empty string only requires the tag. */
  meta?: Record<string, string>
  /** Lower-case response header to a regex source; an empty string only requires the header. */
  headers?: Record<string, string>
  /** Regex sources tested against cookie names. */
  cookies?: string[]
  /** Dotted window path to a regex source tested on its string value; empty means it only has to exist. */
  js?: Record<string, string>
  /** CSS selectors that must match at least one element. */
  dom?: string[]
  /** Negotiated HTTP protocol as reported by the browser, for example h2 or h3. */
  protocol?: string
  /** Maps a captured version fragment to the label shown instead. */
  versionLabels?: Record<string, string>
}

export interface PageSignals {
  url: string
  scripts: string[]
  resources: string[]
  inlineScripts: string
  meta: Record<string, string>
  headers: Record<string, string>
  cookies: string[]
  jsValues: Record<string, string>
  domMatches: string[]
  html: string
  protocol?: string
}

export interface TechHit {
  name: string
  category: TechCategoryId
  version?: string
  evidence: string
  website?: string
  implied?: boolean
}

export interface PageFacts {
  title: string
  description: string
  language: string
  charset: string
  canonical: string
  generator: string
  social: { network: string; url: string }[]
  emails: string[]
  phones: string[]
  feeds: string[]
  counts: { scripts: number; stylesheets: number; images: number; links: number; forms: number; iframes: number }
}

export interface TechScan {
  url: string
  scannedAt: string
  hits: TechHit[]
  facts: PageFacts
  headers: Record<string, string>
  protocol?: string
}
