import { describe, expect, it } from 'vitest'

import {
  applyTemplateVariables,
  contactsToCsv,
  isWithinWorkingHours,
  matchesSmartReply,
  spinText,
} from '@/core/sites/whatsapp'
import { countryForNumber } from '@/core/sites/whatsapp/countries'

describe('whatsapp helpers', () => {
  it('maps numbers to countries by longest calling code', () => {
    expect(countryForNumber('917780591898')).toEqual({ code: '91', country: 'India' })
    expect(countryForNumber('971501234567')).toEqual({ code: '971', country: 'United Arab Emirates' })
    expect(countryForNumber('14155550100').country).toBe('United States / Canada')
    expect(countryForNumber('999').country).toBe('Unknown')
  })

  it('applies template variables', () => {
    expect(applyTemplateVariables('Hi {name}', { name: 'Ada' })).toBe('Hi Ada')
  })

  it('spins spintax', () => {
    const out = spinText('{a|b}')
    expect(['a', 'b']).toContain(out)
  })

  it('matches smart reply keywords', () => {
    expect(matchesSmartReply('hello there', 'hello', false)).toBe(true)
    expect(matchesSmartReply('bye', 'hello', false)).toBe(false)
  })

  it('checks working hours', () => {
    const noon = new Date()
    noon.setHours(12, 0, 0, 0)
    expect(isWithinWorkingHours('09:00', '18:00', noon)).toBe(true)
  })

  it('exports csv', () => {
    expect(contactsToCsv([{ a: '1', b: '2' }])).toContain('"1"')
  })
})
