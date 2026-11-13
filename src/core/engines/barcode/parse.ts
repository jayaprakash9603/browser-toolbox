import { eanCheckDigit, type BarcodeFormat } from './index'

export type DetectedBarcodeFormat =
  | 'qr_code'
  | 'ean_13'
  | 'ean_8'
  | 'upc_a'
  | 'upc_e'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'itf'
  | 'pdf417'
  | 'aztec'
  | 'data_matrix'
  | 'unknown'

export interface ParsedBarcodeField {
  key: string
  value: string
}

export interface ParsedBarcodeContent {
  format: DetectedBarcodeFormat
  label: string
  generatorFormat: BarcodeFormat | null
  fields: ParsedBarcodeField[]
}

const FORMAT_LABEL: Record<DetectedBarcodeFormat, string> = {
  qr_code: 'QR code',
  ean_13: 'EAN-13',
  ean_8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code_128: 'Code 128',
  code_39: 'Code 39',
  code_93: 'Code 93',
  codabar: 'Codabar',
  itf: 'ITF',
  pdf417: 'PDF417',
  aztec: 'Aztec',
  data_matrix: 'Data Matrix',
  unknown: 'Barcode',
}

/** GS1 prefix ranges → issuing country / region. First matching range wins. */
const GS1_RANGES: [number, number, string][] = [
  [0, 19, 'United States / Canada'],
  [20, 29, 'Restricted circulation'],
  [30, 39, 'United States'],
  [50, 59, 'Coupons'],
  [60, 139, 'United States'],
  [300, 379, 'France'],
  [380, 380, 'Bulgaria'],
  [383, 383, 'Slovenia'],
  [385, 385, 'Croatia'],
  [400, 440, 'Germany'],
  [450, 459, 'Japan'],
  [460, 469, 'Russia'],
  [471, 471, 'Taiwan'],
  [489, 489, 'Hong Kong'],
  [490, 499, 'Japan'],
  [500, 509, 'United Kingdom'],
  [520, 521, 'Greece'],
  [539, 539, 'Ireland'],
  [540, 549, 'Belgium / Luxembourg'],
  [560, 560, 'Portugal'],
  [570, 579, 'Denmark'],
  [590, 590, 'Poland'],
  [594, 594, 'Romania'],
  [600, 601, 'South Africa'],
  [628, 628, 'Saudi Arabia'],
  [629, 629, 'United Arab Emirates'],
  [640, 649, 'Finland'],
  [690, 699, 'China'],
  [700, 709, 'Norway'],
  [729, 729, 'Israel'],
  [730, 739, 'Sweden'],
  [750, 750, 'Mexico'],
  [754, 755, 'Canada'],
  [760, 769, 'Switzerland'],
  [789, 790, 'Brazil'],
  [800, 839, 'Italy'],
  [840, 849, 'Spain'],
  [870, 879, 'Netherlands'],
  [880, 880, 'South Korea'],
  [885, 885, 'Thailand'],
  [888, 888, 'Singapore'],
  [890, 890, 'India'],
  [893, 893, 'Vietnam'],
  [899, 899, 'Indonesia'],
  [900, 919, 'Austria'],
  [930, 939, 'Australia'],
  [940, 949, 'New Zealand'],
  [955, 955, 'Malaysia'],
  [978, 979, 'ISBN (book)'],
]

export function normalizeDetectedFormat(raw: string): DetectedBarcodeFormat {
  const key = raw.trim().toLowerCase().replace(/-/g, '_')
  if (key in FORMAT_LABEL) return key as DetectedBarcodeFormat
  if (key === 'qr' || key === 'qrcode') return 'qr_code'
  if (key === 'ean13') return 'ean_13'
  if (key === 'ean8') return 'ean_8'
  if (key === 'upca') return 'upc_a'
  if (key === 'code128') return 'code_128'
  if (key === 'code39') return 'code_39'
  return 'unknown'
}

export function formatLabel(format: DetectedBarcodeFormat): string {
  return FORMAT_LABEL[format]
}

export function generatorFormatFor(format: DetectedBarcodeFormat, data: string): BarcodeFormat | null {
  const digits = data.replace(/\D/g, '')
  switch (format) {
    case 'ean_13':
      return digits.length === 12 || digits.length === 13 ? 'EAN13' : null
    case 'upc_a':
    case 'upc_e':
      return digits.length >= 8 && digits.length <= 13 ? 'UPC' : null
    case 'code_128':
      return 'CODE128'
    case 'code_39':
      return 'CODE39'
    default:
      return null
  }
}

export function gs1Region(gtin: string): string | null {
  const digits = gtin.replace(/\D/g, '')
  if (digits.length < 3) return null
  const prefix = Number(digits.slice(0, 3))
  if (!Number.isFinite(prefix)) return null
  for (const [from, to, label] of GS1_RANGES) {
    if (prefix >= from && prefix <= to) return label
  }
  return null
}

function compact(fields: ParsedBarcodeField[]): ParsedBarcodeField[] {
  return fields.filter((field) => field.value !== '')
}

export function parseBarcodeContent(format: string, raw: string): ParsedBarcodeContent {
  const detected = normalizeDetectedFormat(format)
  const data = raw.trim()
  const digits = data.replace(/\D/g, '')
  const fields: ParsedBarcodeField[] = [{ key: 'value', value: data }]

  if (detected === 'ean_13' || detected === 'upc_a' || detected === 'ean_8' || detected === 'upc_e') {
    const gtin = detected === 'upc_a' && digits.length === 12 ? digits : digits
    fields.push({ key: 'gtin', value: gtin })
    if (gtin.length >= 8) {
      const body = gtin.slice(0, -1)
      const check = gtin.slice(-1)
      try {
        const expected = String(eanCheckDigit(body))
        fields.push({ key: 'checkDigit', value: check })
        fields.push({ key: 'checkOk', value: expected === check ? 'valid' : 'invalid' })
      } catch {
        // Non-numeric payload.
      }
    }
    const region = gs1Region(detected === 'upc_a' && gtin.length === 12 ? `0${gtin}` : gtin)
    if (region) fields.push({ key: 'region', value: region })
    if (gtin.startsWith('978') || gtin.startsWith('979')) fields.push({ key: 'isbn', value: gtin })
  }

  return {
    format: detected,
    label: FORMAT_LABEL[detected],
    generatorFormat: generatorFormatFor(detected, data),
    fields: compact(fields),
  }
}
