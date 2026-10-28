export type A11yCategory =
  | 'images'
  | 'links'
  | 'forms'
  | 'structure'
  | 'visual'
  | 'keyboard'
  | 'aria'
  | 'media'
  | 'document'

export type A11ySeverity = 'error' | 'warning' | 'notice'

/** WCAG conformance level, or `best` for widely agreed practice that WCAG does not require. */
export type A11yLevel = 'A' | 'AA' | 'AAA' | 'best'

export type A11yRuleId =
  | 'img-alt'
  | 'img-alt-suspicious'
  | 'img-alt-long'
  | 'link-name'
  | 'link-generic'
  | 'link-new-window'
  | 'link-empty-href'
  | 'button-name'
  | 'label'
  | 'label-placeholder-only'
  | 'autocomplete-valid'
  | 'page-has-h1'
  | 'heading-order'
  | 'empty-heading'
  | 'landmark-main'
  | 'skip-link'
  | 'list-structure'
  | 'table-headers'
  | 'duplicate-id-aria'
  | 'color-contrast'
  | 'color-contrast-enhanced'
  | 'contrast-review'
  | 'link-distinguishable'
  | 'text-small'
  | 'tabindex-positive'
  | 'clickable-focusable'
  | 'aria-valid-role'
  | 'aria-hidden-focus'
  | 'aria-valid-reference'
  | 'aria-required-attr'
  | 'video-caption'
  | 'media-autoplay'
  | 'blink-marquee'
  | 'document-title'
  | 'html-lang'
  | 'html-lang-valid'
  | 'meta-viewport-zoom'
  | 'meta-refresh'
  | 'frame-title'

export interface A11yRuleMeta {
  id: A11yRuleId
  category: A11yCategory
  severity: A11ySeverity
  level: A11yLevel
  /** WCAG 2.2 success criteria, e.g. `1.1.1`. Empty for best-practice rules. */
  wcag: string[]
}

export interface A11yNode {
  /** Empty for page-level findings such as a missing title or `lang`. */
  selector: string
  snippet: string
  /** Short human detail: the offending text, the computed ratio, the bad role… */
  detail?: string
  fg?: string
  bg?: string
  ratio?: number
  required?: number
}

/** What the page script reports for one rule. `checked` is 0 when nothing on the page applies. */
export interface A11yRuleScan {
  id: A11yRuleId
  checked: number
  failed: number
  nodes: A11yNode[]
}

export interface A11yHeading {
  level: number
  text: string
  selector: string
  /** Level jumped by more than one from the previous heading. */
  skipped: boolean
}

export interface A11yLandmark {
  role: string
  label: string
  selector: string
}

export interface A11yPageStats {
  elements: number
  images: number
  links: number
  buttons: number
  formFields: number
  focusable: number
  textNodes: number
  durationMs: number
}

export interface A11yPageScan {
  url: string
  title: string
  lang: string
  rules: A11yRuleScan[]
  headings: A11yHeading[]
  landmarks: A11yLandmark[]
  stats: A11yPageStats
}

export interface A11yAuditOptions {
  /** Failing elements kept per rule; the count stays exact. */
  maxNodes: number
  contrast: boolean
}

export type A11yRuleStatus = 'fail' | 'pass' | 'na'

export interface A11yRuleOutcome extends A11yRuleMeta, A11yRuleScan {
  status: A11yRuleStatus
}

export interface A11yCategorySummary {
  id: A11yCategory
  failed: number
  passed: number
  errors: number
  warnings: number
  notices: number
  /** 0–100 for the rules in this category that apply to the page. */
  score: number
}

export interface A11yReport {
  scan: A11yPageScan
  outcomes: A11yRuleOutcome[]
  categories: A11yCategorySummary[]
  score: number
  counts: { errors: number; warnings: number; notices: number; passed: number; elements: number }
}

export interface A11yReportFilter {
  includeAAA: boolean
  includeNotices: boolean
}
