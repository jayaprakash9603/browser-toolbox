import { describe, expect, it } from 'vitest'

import {
  assessRisk,
  COMMON_PATTERNS,
  compileRegex,
  DEFAULT_REGEX_FLAGS,
  flagsToString,
  replaceWithRegex,
  testRegex,
} from '@/core/engines/regex'

const flags = { ...DEFAULT_REGEX_FLAGS }

describe('regex engine', () => {
  it('compiles valid patterns and rejects invalid ones', () => {
    expect(compileRegex('\\d+', flags).ok).toBe(true)
    const bad = compileRegex('(', flags)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.length).toBeGreaterThan(0)
  })

  it('builds flag strings', () => {
    expect(flagsToString({ global: true, ignoreCase: true, multiline: false, dotAll: true, unicode: false })).toBe('gis')
  })

  it('finds matches with groups and named groups', () => {
    const result = testRegex('(?<word>\\w+)-(\\d+)', 'abc-123 def-456', flags)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.totalCount).toBe(2)
      expect(result.matches[0]).toMatchObject({ match: 'abc-123', index: 0 })
      expect(result.matches[0].groups[1]).toBe('123')
      expect(result.matches[0].namedGroups.word).toBe('abc')
    }
  })

  it('handles zero-length matches without looping forever', () => {
    const result = testRegex('a*', 'bbb', flags)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.totalCount).toBe(4)
  })

  it('rejects oversized input', () => {
    const result = testRegex('x', 'x'.repeat(500_001), flags)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/too large/i)
  })

  it('truncates match lists beyond the cap', () => {
    const result = testRegex('\\d', '1'.repeat(1500), flags)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.matches).toHaveLength(1000)
      expect(result.totalCount).toBe(1500)
      expect(result.truncated).toBe(true)
    }
  })

  it('warns about catastrophic backtracking patterns', () => {
    expect(assessRisk('(a+)+$')).not.toHaveLength(0)
    expect(assessRisk('\\d+')).toHaveLength(0)
  })

  it('replaces with $1 group references', () => {
    const result = replaceWithRegex('(\\w+)@(\\w+)', '$2/$1', 'user@host', flags)
    expect(result).toEqual({ ok: true, output: 'host/user', count: 1 })
  })

  it('provides a common pattern catalog that all compile', () => {
    expect(COMMON_PATTERNS.length).toBeGreaterThanOrEqual(8)
    for (const pattern of COMMON_PATTERNS) {
      expect(compileRegex(pattern.pattern, { ...flags, ...pattern.flags }).ok).toBe(true)
    }
  })

  it('common patterns match their own examples', () => {
    for (const pattern of COMMON_PATTERNS) {
      const result = testRegex(pattern.pattern, pattern.example, { ...flags, ...pattern.flags })
      expect(result.ok && result.totalCount > 0).toBe(true)
    }
  })
})
