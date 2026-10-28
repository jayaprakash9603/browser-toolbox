import type { CapturedElement, SelectorSet } from '@/core/engines/selector'

export interface PickedElement {
  element: CapturedElement
  selectors: SelectorSet
}

export const INSPECTOR_TABS = ['overview', 'box', 'styles', 'selectors', 'a11y'] as const
export type InspectorTab = (typeof INSPECTOR_TABS)[number]

export const FOCUS_TO_TAB: Record<string, InspectorTab> = {
  'section-text': 'overview',
  'section-attributes': 'overview',
  'section-ancestors': 'overview',
  'section-box': 'box',
  'section-computed': 'styles',
  'section-selectors': 'selectors',
  'section-a11y': 'a11y',
  'section-html': 'a11y',
}
