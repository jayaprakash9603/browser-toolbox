import { describe, expect, it } from 'vitest'

import { createBarcodeSvg } from '@/core/engines/barcode'
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

function rasterizeCode128(text: string) {
  const style = {
    lineColor: '#000000',
    background: '#ffc800',
    height: 72,
    margin: 12,
    moduleWidth: 3,
    displayValue: false,
    fontSize: 12,
  }
  const svg = createBarcodeSvg('CODE128', text, style)
  if (!svg.ok) throw new Error(svg.error)
  const { width, height } = svg.value
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  const bg = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(style.background)
  const ink = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(style.lineColor)
  const fillRgb = bg ? [Number.parseInt(bg[1], 16), Number.parseInt(bg[2], 16), Number.parseInt(bg[3], 16)] : [255, 255, 255]
  const barRgb = ink ? [Number.parseInt(ink[1], 16), Number.parseInt(ink[2], 16), Number.parseInt(ink[3], 16)] : [0, 0, 0]
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillRgb[0]
    data[i + 1] = fillRgb[1]
    data[i + 2] = fillRgb[2]
    data[i + 3] = 255
  }
  for (const match of svg.value.svg.matchAll(
    /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#000000"\/>/g,
  )) {
    const x0 = Math.round(Number(match[1]))
    const y0 = Math.round(Number(match[2]))
    const w = Math.round(Number(match[3]))
    const h = Math.round(Number(match[4]))
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        const offset = (y * width + x) * 4
        data[offset] = barRgb[0]
        data[offset + 1] = barRgb[1]
        data[offset + 2] = barRgb[2]
      }
    }
  }
  return { data, width, height }
}

describe('decodeCodesFromImage', () => {
  it('returns nothing on an empty bitmap when no native detector is present', async () => {
    const codes = await decodeCodesFromImage({
      data: new Uint8ClampedArray(400),
      width: 20,
      height: 20,
    })
    expect(codes).toEqual([])
  })

  it('decodes a Code 128 barcode via the ZXing fallback', async () => {
    const payload = 'TEST-128'
    const image = rasterizeCode128(payload)
    const codes = await decodeCodesFromImage(image)
    const barcode = codes.find((code) => code.family === 'barcode')
    expect(barcode?.data).toBe(payload)
    expect(barcode?.format).toBe('code_128')
  })
})
