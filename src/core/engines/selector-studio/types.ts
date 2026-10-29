export type SelectorKind = 'css' | 'xpath'

export type SelectorStrategy =
  | 'id'
  | 'test-attribute'
  | 'semantic'
  | 'attribute'
  | 'class'
  | 'compound'
  | 'text'
  | 'relative'
  | 'parent-child'
  | 'sibling'
  | 'structural'
  | 'ancestor'
  | 'predicate'
  | 'nth'
  | 'has'
  | 'scope'
  | 'shadow'
  | 'frame'

export type Uniqueness = 'unique' | 'multiple' | 'none' | 'unknown'

export type RankMode = 'stable' | 'shortest' | 'readable' | 'specific' | 'automation'

export type FrameworkId = 'selenium' | 'playwright' | 'puppeteer' | 'cypress' | 'webdriverio'

export type CandidateContext = 'browser' | 'requires-shadow' | 'requires-frame' | 'cannot-verify'

export interface AncestorNode {
  tag: string
  id: string
  classes: string[]
  attributes: Record<string, string>
  indexAmongSameTag: number
  indexAmongSiblings: number
}

export interface SiblingSummary {
  tag: string
  id: string
  classes: string[]
  attributes: Record<string, string>
  text: string
}

export interface LabelAssociation {
  text: string
  relationship: 'for' | 'wrapping' | 'preceding-sibling'
}

export interface ShadowHostInfo {
  tag: string
  id: string
  classes: string[]
  attributes: Record<string, string>
  mode: 'open' | 'closed'
}

export interface FrameContext {
  url: string
  sameOrigin: boolean
  isTop: boolean
}

export interface SelectorSnapshot {
  tag: string
  id: string
  classes: string[]
  attributes: Record<string, string>
  text: string
  ownText: string
  parentChain: AncestorNode[]
  indexAmongSameTag: number
  indexAmongSiblings: number
  label: LabelAssociation | null
  previousSibling: SiblingSummary | null
  nextSibling: SiblingSummary | null
  namespaceURI: string | null
  isSvg: boolean
  connected: boolean
  shadowHosts: ShadowHostInfo[]
  frame: FrameContext
  identityPath: string
  idUnique: boolean | null
  testIdUnique: boolean | null
  pageUrl: string
}

export interface SelectorCandidate {
  id: string
  kind: SelectorKind
  strategy: SelectorStrategy
  expression: string
  context: CandidateContext
  uniqueness: Uniqueness
  matchCount: number | null
  intendedMatched: boolean | null
  syntaxValid: boolean | null
  score: number
  reasons: string[]
  warnings: string[]
  /** Nested CSS/XPath steps when a single expression cannot cross a shadow root. */
  piercePath?: string[]
}

export interface EvaluationResult {
  syntaxValid: boolean
  matchCount: number
  error?: string
  intendedMatched: boolean | null
}

export interface FrameworkSnippet {
  framework: FrameworkId
  label: string
  language: 'python' | 'typescript' | 'javascript'
  api: string
  locator: string
  code: string
}

export const TEST_ATTRIBUTES = ['data-testid', 'data-test', 'data-qa', 'data-cy'] as const

export const STABLE_ATTRIBUTES = [
  ...TEST_ATTRIBUTES,
  'name',
  'aria-label',
  'title',
  'role',
  'placeholder',
  'type',
  'href',
  'value',
  'alt',
  'for',
] as const

export const STRATEGY_PRIORITY: Record<SelectorStrategy, number> = {
  'test-attribute': 0,
  id: 1,
  semantic: 2,
  attribute: 3,
  compound: 4,
  class: 5,
  relative: 6,
  ancestor: 7,
  'parent-child': 8,
  sibling: 9,
  text: 10,
  predicate: 11,
  has: 12,
  nth: 13,
  scope: 14,
  structural: 15,
  shadow: 16,
  frame: 17,
}

export const RANK_MODES: RankMode[] = ['stable', 'shortest', 'readable', 'specific', 'automation']
