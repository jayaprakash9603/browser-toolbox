import {
  clearSelectorHighlights,
  highlightSelectorMatches,
  type InPageHighlightResult,
} from '@/core/engines/selector-studio/inPage'

export function highlightStudioSelector(
  kind: 'css' | 'xpath',
  expression: string,
  identityPath: string | null,
): InPageHighlightResult {
  return highlightSelectorMatches(kind, expression, identityPath)
}

export function clearStudioHighlights(): void {
  clearSelectorHighlights()
}
