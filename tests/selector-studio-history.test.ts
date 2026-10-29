import { describe, expect, it } from 'vitest'

import { entryFromCandidate, exportHistory, importHistory, HISTORY_LIMIT } from '@/features/selector-studio/history'
import type { SelectorCandidate } from '@/core/engines/selector-studio'

const candidate: SelectorCandidate = {
  id: 'css:id:#ok',
  kind: 'css',
  strategy: 'id',
  expression: '#ok',
  context: 'browser',
  uniqueness: 'unique',
  matchCount: 1,
  intendedMatched: true,
  syntaxValid: true,
  score: 80,
  reasons: [],
  warnings: [],
}

describe('selector-studio history', () => {
  it('exports and imports locators without page text', () => {
    const entry = entryFromCandidate(candidate, 'https://example.com/app', { name: 'Login' })
    const json = exportHistory([entry])
    expect(json).not.toMatch(/innerHTML|textContent/)
    const restored = importHistory(json, [])
    expect(restored[0]?.expression).toBe('#ok')
    expect(restored[0]?.pageUrl).toBe('https://example.com/app')
  })

  it('caps imported history', () => {
    const incoming = Array.from({ length: 80 }, (_, index) =>
      entryFromCandidate({ ...candidate, expression: `#n${index}`, id: `id-${index}` }, 'https://a.test'),
    )
    const imported = importHistory(JSON.stringify({ history: incoming }), [])
    expect(imported.length).toBe(HISTORY_LIMIT)
  })
})
