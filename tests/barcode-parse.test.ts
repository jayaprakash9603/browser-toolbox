import { describe, expect, it } from 'vitest'

import { generatorFormatFor, gs1Region, parseBarcodeContent } from '@/core/engines/barcode/parse'
import { decodeCodesFromImage } from '@/core/engines/codes/decode'

describe('parseBarcodeContent', () => {
  it('reads EAN-13 GTIN, check digit and GS1 region', () => {
    const parsed = parseBarcodeContent('ean_13', '5901234123457')
    expect(parsed.label).toBe('EAN-13')
    expect(parsed.generatorFormat).toBe('EAN13')
    expect(parsed.fields).toEqual(
      expect.arrayContaining([
        { key: 'gtin', value: '5901234123457' },
        { key: 'checkDigit', value: '7' },
        { key: 'checkOk', value: 'valid' },
        { key: 'region', value: 'Poland' },
      ]),
    )
  })

  it('flags a bad check digit', () => {
    const parsed = parseBarcodeContent('ean_13', '5901234123450')
    expect(parsed.fields.find((field) => field.key === 'checkOk')?.value).toBe('invalid')
  })

  it('labels ISBN book codes', () => {
    const parsed = parseBarcodeContent('EAN-13', '9780143127741')
    expect(parsed.fields.find((field) => field.key === 'isbn')?.value).toBe('9780143127741')
    expect(gs1Region('9780143127741')).toBe('ISBN (book)')
  })

  it('maps linear formats to the barcode generator', () => {
    expect(generatorFormatFor('code_128', 'TOOLBOX-2026')).toBe('CODE128')
    expect(generatorFormatFor('code_39', 'SAMPLE-39')).toBe('CODE39')
    expect(generatorFormatFor('upc_a', '036000291452')).toBe('UPC')
    expect(generatorFormatFor('qr_code', 'https://example.com')).toBeNull()
  })

  it('keeps Code 128 as the raw payload', () => {
    const parsed = parseBarcodeContent('code_128', 'https://example.com/go')
    expect(parsed.fields[0]).toEqual({ key: 'value', value: 'https://example.com/go' })
  })
})

describe('decodeCodesFromImage', () => {
  it('returns nothing on an empty bitmap when no native detector is present', async () => {
    const codes = await decodeCodesFromImage({
      data: new Uint8ClampedArray(400),
      width: 20,
      height: 20,
    })
    expect(codes).toEqual([])
  })
})
