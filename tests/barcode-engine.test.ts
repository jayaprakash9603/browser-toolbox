import { describe, expect, it } from 'vitest'

import { createBarcodeSvg, eanCheckDigit, normalizeEan13, validateBarcode } from '@/core/engines/barcode'

describe('barcode engine', () => {
  it('computes EAN check digits', () => {
    expect(eanCheckDigit('590123412345')).toBe(7)
    expect(normalizeEan13('590123412345')).toBe('5901234123457')
  })

  it('validates Code 39 charset', () => {
    expect(validateBarcode('CODE39', 'HELLO-9').ok).toBe(true)
    expect(validateBarcode('CODE39', 'hello').ok).toBe(true)
    expect(validateBarcode('CODE39', 'bad#').ok).toBe(false)
  })

  it('renders svg for Code 128', () => {
    const out = createBarcodeSvg('CODE128', 'TEST', {
      lineColor: '#000',
      background: '#fff',
      height: 60,
      margin: 8,
      moduleWidth: 2,
      displayValue: true,
      fontSize: 12,
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.value.svg).toContain('<svg')
      expect(out.value.width).toBeGreaterThan(100)
    }
  })
})
