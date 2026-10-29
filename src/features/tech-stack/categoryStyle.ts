import type { TechCategoryId } from '@/core/engines/techStack/types'

type Family =
  | 'frontend'
  | 'ui'
  | 'analytics'
  | 'marketing'
  | 'security'
  | 'commerce'
  | 'infra'
  | 'content'
  | 'media'
  | 'other'

const FAMILY_COLOR: Record<Family, string> = {
  frontend: 'var(--hero-from)',
  ui: 'var(--hero-via)',
  analytics: 'var(--speed-down)',
  marketing: 'var(--tile-4)',
  security: 'var(--success)',
  commerce: 'var(--speed-up)',
  infra: 'var(--warning)',
  content: 'var(--accent-brand)',
  media: 'var(--netmon-latency)',
  other: 'var(--muted-foreground)',
}

const CATEGORY_FAMILY = {
  'js-framework': 'frontend',
  'web-framework': 'frontend',
  'js-library': 'frontend',
  ssg: 'frontend',
  'build-tool': 'frontend',
  'ui-framework': 'ui',
  analytics: 'analytics',
  rum: 'analytics',
  'error-tracking': 'analytics',
  'tag-manager': 'marketing',
  advertising: 'marketing',
  marketing: 'marketing',
  'ab-testing': 'marketing',
  security: 'security',
  'cookie-compliance': 'security',
  authentication: 'security',
  ecommerce: 'commerce',
  payment: 'commerce',
  crm: 'commerce',
  'live-chat': 'commerce',
  'web-server': 'infra',
  'programming-language': 'infra',
  database: 'infra',
  os: 'infra',
  hosting: 'infra',
  cdn: 'infra',
  caching: 'infra',
  backend: 'infra',
  performance: 'infra',
  cms: 'content',
  'page-builder': 'content',
  'cms-plugin': 'content',
  documentation: 'content',
  search: 'content',
  font: 'media',
  maps: 'media',
  video: 'media',
  widget: 'media',
  comments: 'media',
  'asset-management': 'media',
  misc: 'other',
} as const satisfies Record<TechCategoryId, Family>

export function categoryColor(id: TechCategoryId): string {
  return FAMILY_COLOR[CATEGORY_FAMILY[id]]
}

export function mixTint(color: string, amount = 14): string {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`
}

export function scanAccent(status: 'loading' | 'ready' | 'error', count: number): string {
  if (status === 'error') return 'var(--destructive)'
  if (status === 'loading' || count > 0) return 'var(--hero-from)'
  return 'var(--muted-foreground)'
}
