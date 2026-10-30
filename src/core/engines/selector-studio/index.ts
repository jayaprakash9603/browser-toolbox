export { captureSelectorSnapshot } from './capture'
export {
  captureElementInspect,
  captureInspectByIdentity,
  type ElementInspect,
  type InspectListener,
  type MatchedStyleRule,
} from './inspect'
export { snapshotFromCaptured } from './fromCaptured'
export { generateCssCandidates } from './css'
export {
  cssAttrEquals,
  cssClassTokens,
  cssIdSelector,
  escapeCssAttr,
  escapeCssIdent,
  xpathLiteral,
} from './escape'
export { FRAMEWORK_LABELS, frameworkSnippets } from './frameworks'
export { bestCandidate, candidatesByKind, generateCandidates } from './generate'
export { applyScores, compareCandidates, rankCandidates, scoreCandidate, uniquenessOf } from './score'
export { generatedClassesOf, isGeneratedClass, looksStableId } from './stability'
export type {
  CandidateContext,
  EvaluationResult,
  FrameworkId,
  FrameworkSnippet,
  RankMode,
  SelectorCandidate,
  SelectorKind,
  SelectorSnapshot,
  SelectorStrategy,
  Uniqueness,
} from './types'
export { RANK_MODES, STABLE_ATTRIBUTES, STRATEGY_PRIORITY, TEST_ATTRIBUTES } from './types'
export { applyEvaluation, interpretQuery, statusLabel } from './validate'
export { generateXPathCandidates, xpathStructural } from './xpath'
