import type { TechCategoryId } from './types'

/** Display order of the grouped results; earlier categories are shown first. */
export const TECH_CATEGORIES: { id: TechCategoryId; label: string }[] = [
  { id: 'cms', label: 'CMS' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'page-builder', label: 'Page builders' },
  { id: 'cms-plugin', label: 'WordPress plugins' },
  { id: 'js-framework', label: 'JavaScript frameworks' },
  { id: 'web-framework', label: 'Web frameworks' },
  { id: 'ui-framework', label: 'UI frameworks' },
  { id: 'js-library', label: 'JavaScript libraries' },
  { id: 'ssg', label: 'Static site generators' },
  { id: 'build-tool', label: 'Build tools' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'tag-manager', label: 'Tag managers' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'marketing', label: 'Marketing automation' },
  { id: 'ab-testing', label: 'A/B testing' },
  { id: 'rum', label: 'RUM' },
  { id: 'error-tracking', label: 'Error tracking' },
  { id: 'payment', label: 'Payment processors' },
  { id: 'live-chat', label: 'Live chat' },
  { id: 'crm', label: 'CRM' },
  { id: 'web-server', label: 'Web servers' },
  { id: 'programming-language', label: 'Programming languages' },
  { id: 'database', label: 'Databases' },
  { id: 'os', label: 'Operating systems' },
  { id: 'hosting', label: 'PaaS & hosting' },
  { id: 'cdn', label: 'CDN' },
  { id: 'caching', label: 'Caching' },
  { id: 'asset-management', label: 'Digital asset management' },
  { id: 'security', label: 'Security' },
  { id: 'cookie-compliance', label: 'Cookie compliance' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'backend', label: 'Backend services' },
  { id: 'search', label: 'Search' },
  { id: 'font', label: 'Font scripts' },
  { id: 'maps', label: 'Maps' },
  { id: 'video', label: 'Video players' },
  { id: 'widget', label: 'Widgets' },
  { id: 'comments', label: 'Comment systems' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'performance', label: 'Performance' },
  { id: 'misc', label: 'Miscellaneous' },
]

const LABELS = new Map(TECH_CATEGORIES.map(({ id, label }) => [id, label]))
const ORDER = new Map(TECH_CATEGORIES.map(({ id }, index) => [id, index]))

export function categoryLabel(id: TechCategoryId): string {
  return LABELS.get(id) ?? id
}

export function categoryOrder(id: TechCategoryId): number {
  return ORDER.get(id) ?? TECH_CATEGORIES.length
}
