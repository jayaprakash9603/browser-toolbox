import type { JsonLdBlock } from './types'

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  Article: ['headline'],
  NewsArticle: ['headline'],
  BlogPosting: ['headline'],
  Product: ['name'],
  Organization: ['name'],
  LocalBusiness: ['name'],
  WebSite: ['name', 'url'],
  BreadcrumbList: ['itemListElement'],
  FAQPage: ['mainEntity'],
}

export interface SchemaValidationIssue {
  type: string
  missing: string[]
  parseError?: string
}

function collectTypes(node: unknown, types: Set<string>): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item) => collectTypes(item, types))
    return
  }
  const obj = node as Record<string, unknown>
  const t = obj['@type']
  if (typeof t === 'string') types.add(t)
  if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x))
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') collectTypes(value, types)
  }
}

function hasProperty(node: unknown, prop: string): boolean {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some((item) => hasProperty(item, prop))
  const obj = node as Record<string, unknown>
  if (prop in obj && obj[prop] != null && obj[prop] !== '') return true
  return Object.values(obj).some((v) => v && typeof v === 'object' && hasProperty(v, prop))
}

export function validateJsonLd(blocks: JsonLdBlock[]): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = []
  for (const block of blocks) {
    if (block.error) {
      issues.push({ type: 'JSON-LD', missing: [], parseError: block.error })
      continue
    }
    if (!block.parsed) continue
    const types = new Set<string>()
    collectTypes(block.parsed, types)
    for (const type of types) {
      const required = REQUIRED_BY_TYPE[type]
      if (!required) continue
      const missing = required.filter((prop) => !hasProperty(block.parsed, prop))
      if (missing.length > 0) issues.push({ type, missing })
    }
  }
  return issues
}

export function flattenJsonLdTypes(blocks: JsonLdBlock[]): string[] {
  const types = new Set<string>()
  for (const block of blocks) {
    if (block.parsed) collectTypes(block.parsed, types)
  }
  return [...types]
}
