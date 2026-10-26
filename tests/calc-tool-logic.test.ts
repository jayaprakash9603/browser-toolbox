import { describe, expect, it } from 'vitest'

import { appendKey, backspaceExpr, formatResult, livePreview, negateExpr } from '@/tools/calculators/calculator/logic'

describe('calculator tool logic', () => {
  it('formats integers and trims float noise', () => {
    expect(formatResult(42)).toBe('42')
    expect(formatResult(1 / 3)).toMatch(/^0\.333/)
  })

  it('previews valid expressions', () => {
    const good = livePreview('2+3')
    expect(good?.ok).toBe(true)
    if (good?.ok) expect(good.value).toBe('5')
    expect(livePreview('2+')?.ok).toBe(false)
  })

  it('backspaces trailing function names', () => {
    expect(backspaceExpr('12+sin')).toBe('12+')
    expect(backspaceExpr('sqrt')).toBe('')
  })

  it('negates wrapped expressions', () => {
    expect(negateExpr('3')).toBe('(-3)')
    expect(negateExpr('(-3)')).toBe('3')
  })

  it('appends function tokens with an open paren', () => {
    expect(appendKey('', { id: 'sin', label: 'sin', kind: 'fn', append: 'sin' })).toBe('sin(')
    expect(appendKey('2+', { id: '3', label: '3', kind: 'digit', append: '3' })).toBe('2+3')
  })
})
