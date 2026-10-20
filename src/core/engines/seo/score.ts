import type { SeoCategory, SeoCheck } from './types'

const CATEGORIES: SeoCategory[] = [
  'overview',
  'head',
  'content',
  'headings',
  'links',
  'images',
  'structured',
  'social',
  'hreflang',
  'performance',
]

export function scoreSeoChecks(checks: SeoCheck[]): {
  score: number
  byCategory: Record<SeoCategory, { passed: number; total: number; score: number }>
} {
  const byCategory = {} as Record<SeoCategory, { passed: number; total: number; score: number }>
  for (const cat of CATEGORIES) {
    byCategory[cat] = { passed: 0, total: 0, score: 0 }
  }

  let earned = 0
  let possible = 0

  for (const check of checks) {
    if (check.weight <= 0) continue
    const bucket = byCategory[check.category]
    bucket.total += 1
    possible += check.weight
    if (check.ok) {
      bucket.passed += 1
      earned += check.weight
    }
  }

  for (const cat of CATEGORIES) {
    const b = byCategory[cat]
    b.score = b.total === 0 ? 100 : Math.round((b.passed / b.total) * 100)
  }

  const score = possible === 0 ? 100 : Math.round((earned / possible) * 100)
  return { score, byCategory }
}
