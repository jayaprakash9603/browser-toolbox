import type { A11yCategory, A11yRuleId, A11yRuleMeta } from './types'

export const A11Y_CATEGORIES: readonly A11yCategory[] = [
  'images',
  'links',
  'forms',
  'structure',
  'visual',
  'keyboard',
  'aria',
  'media',
  'document',
]

const rule = (
  id: A11yRuleId,
  category: A11yCategory,
  severity: A11yRuleMeta['severity'],
  level: A11yRuleMeta['level'],
  wcag: string[] = [],
): A11yRuleMeta => ({ id, category, severity, level, wcag })

export const A11Y_RULES: readonly A11yRuleMeta[] = [
  rule('img-alt', 'images', 'error', 'A', ['1.1.1']),
  rule('img-alt-suspicious', 'images', 'warning', 'A', ['1.1.1']),
  rule('img-alt-long', 'images', 'notice', 'best'),

  rule('link-name', 'links', 'error', 'A', ['2.4.4', '4.1.2']),
  rule('button-name', 'links', 'error', 'A', ['4.1.2']),
  rule('link-generic', 'links', 'warning', 'A', ['2.4.4']),
  rule('link-empty-href', 'links', 'notice', 'best'),
  rule('link-new-window', 'links', 'notice', 'AAA', ['3.2.5']),

  rule('label', 'forms', 'error', 'A', ['1.3.1', '4.1.2']),
  rule('label-placeholder-only', 'forms', 'warning', 'A', ['3.3.2']),
  rule('autocomplete-valid', 'forms', 'warning', 'AA', ['1.3.5']),

  rule('page-has-h1', 'structure', 'warning', 'best'),
  rule('heading-order', 'structure', 'warning', 'best'),
  rule('empty-heading', 'structure', 'warning', 'AA', ['2.4.6']),
  rule('landmark-main', 'structure', 'warning', 'best'),
  rule('skip-link', 'structure', 'notice', 'A', ['2.4.1']),
  rule('list-structure', 'structure', 'warning', 'A', ['1.3.1']),
  rule('table-headers', 'structure', 'warning', 'A', ['1.3.1']),
  rule('duplicate-id-aria', 'structure', 'warning', 'A', ['1.3.1', '4.1.2']),

  rule('color-contrast', 'visual', 'error', 'AA', ['1.4.3']),
  rule('link-distinguishable', 'visual', 'warning', 'A', ['1.4.1']),
  rule('contrast-review', 'visual', 'notice', 'AA', ['1.4.3']),
  rule('text-small', 'visual', 'notice', 'best'),
  rule('color-contrast-enhanced', 'visual', 'notice', 'AAA', ['1.4.6']),

  rule('clickable-focusable', 'keyboard', 'error', 'A', ['2.1.1']),
  rule('tabindex-positive', 'keyboard', 'warning', 'A', ['2.4.3']),

  rule('aria-valid-role', 'aria', 'error', 'A', ['4.1.2']),
  rule('aria-hidden-focus', 'aria', 'error', 'A', ['4.1.2']),
  rule('aria-required-attr', 'aria', 'error', 'A', ['4.1.2']),
  rule('aria-valid-reference', 'aria', 'warning', 'A', ['1.3.1', '4.1.2']),

  rule('video-caption', 'media', 'error', 'A', ['1.2.2']),
  rule('media-autoplay', 'media', 'warning', 'A', ['1.4.2']),
  rule('blink-marquee', 'media', 'error', 'A', ['2.2.2']),

  rule('document-title', 'document', 'error', 'A', ['2.4.2']),
  rule('html-lang', 'document', 'error', 'A', ['3.1.1']),
  rule('html-lang-valid', 'document', 'error', 'A', ['3.1.1']),
  rule('meta-viewport-zoom', 'document', 'error', 'AA', ['1.4.4']),
  rule('meta-refresh', 'document', 'error', 'A', ['2.2.1']),
  rule('frame-title', 'document', 'error', 'A', ['4.1.2']),
]

const BY_ID = new Map(A11Y_RULES.map((meta) => [meta.id, meta]))

export function getRuleMeta(id: A11yRuleId): A11yRuleMeta | undefined {
  return BY_ID.get(id)
}

const UNDERSTANDING_SLUGS: Record<string, string> = {
  '1.1.1': 'non-text-content',
  '1.2.2': 'captions-prerecorded',
  '1.3.1': 'info-and-relationships',
  '1.3.5': 'identify-input-purpose',
  '1.4.1': 'use-of-color',
  '1.4.2': 'audio-control',
  '1.4.3': 'contrast-minimum',
  '1.4.4': 'resize-text',
  '1.4.6': 'contrast-enhanced',
  '2.1.1': 'keyboard',
  '2.2.1': 'timing-adjustable',
  '2.2.2': 'pause-stop-hide',
  '2.4.1': 'bypass-blocks',
  '2.4.2': 'page-titled',
  '2.4.3': 'focus-order',
  '2.4.4': 'link-purpose-in-context',
  '2.4.6': 'headings-and-labels',
  '3.1.1': 'language-of-page',
  '3.2.5': 'change-on-request',
  '3.3.2': 'labels-or-instructions',
  '4.1.2': 'name-role-value',
}

export function wcagUnderstandingUrl(criterion: string): string | null {
  const slug = UNDERSTANDING_SLUGS[criterion]
  return slug ? `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html` : null
}
