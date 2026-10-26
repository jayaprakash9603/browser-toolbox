export type BarcodeFormat = 'EAN13' | 'UPC' | 'CODE128' | 'CODE39'

export interface BarcodeStyle {
  lineColor: string
  background: string
  height: number
  margin: number
  moduleWidth: number
  displayValue: boolean
  fontSize: number
}

export interface BarcodeSvg {
  svg: string
  width: number
  height: number
  payload: string
}

export type BarcodeResult = { ok: true; value: BarcodeSvg } | { ok: false; error: string }

const L: Record<string, string> = {
  '0': '0001101',
  '1': '0011001',
  '2': '0010011',
  '3': '0111101',
  '4': '0100011',
  '5': '0110001',
  '6': '0101111',
  '7': '0111011',
  '8': '0110111',
  '9': '0001011',
}
const G: Record<string, string> = {
  '0': '0100111',
  '1': '0110011',
  '2': '0011011',
  '3': '0100001',
  '4': '0011101',
  '5': '0111001',
  '6': '0000101',
  '7': '0010001',
  '8': '0001001',
  '9': '0010111',
}
const R = L

const PARITY: Record<string, string> = {
  '0': 'LLLLLL',
  '1': 'LLGLGG',
  '2': 'LLGGLG',
  '3': 'LLGGGL',
  '4': 'LGLLGG',
  '5': 'LGGLLG',
  '6': 'LGGGLL',
  '7': 'LGLGLG',
  '8': 'LGLGGL',
  '9': 'LGGLGL',
}

const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'
const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
}

const C128: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

export function eanCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i += 1) {
    const n = Number(digits[i])
    if (!Number.isFinite(n)) throw new Error('Invalid digit')
    sum += i % 2 === 0 ? n : n * 3
  }
  return (10 - (sum % 10)) % 10
}

export function normalizeEan13(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 12) return `${digits}${eanCheckDigit(digits)}`
  if (digits.length === 13) {
    const check = eanCheckDigit(digits.slice(0, 12))
    if (check !== Number(digits[12])) return null
    return digits
  }
  return null
}

export function normalizeUpc(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11) {
    const body = `0${digits}`
    return `${body}${eanCheckDigit(body)}`
  }
  if (digits.length === 12) {
    const check = eanCheckDigit(digits.slice(0, 11))
    if (check !== Number(digits[11])) return null
    return digits
  }
  return null
}

export function validateBarcode(format: BarcodeFormat, text: string): BarcodeResult | { ok: true; payload: string } {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Enter a value to encode.' }
  switch (format) {
    case 'EAN13': {
      const payload = normalizeEan13(trimmed)
      if (!payload) return { ok: false, error: 'EAN-13 needs 12 or 13 digits with a valid check digit.' }
      return { ok: true, payload }
    }
    case 'UPC': {
      const payload = normalizeUpc(trimmed)
      if (!payload) return { ok: false, error: 'UPC-A needs 11 or 12 digits with a valid check digit.' }
      return { ok: true, payload }
    }
    case 'CODE39': {
      const upper = trimmed.toUpperCase()
      if (![...upper].every((ch) => CODE39_CHARS.includes(ch)))
        return { ok: false, error: 'Code 39 supports A–Z, 0–9, space, and - . $ / + %' }
      return { ok: true, payload: upper }
    }
    case 'CODE128': {
      if (![...trimmed].every((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126))
        return { ok: false, error: 'Code 128 (Set B) supports standard printable ASCII.' }
      return { ok: true, payload: trimmed }
    }
    default:
      return { ok: false, error: 'Unknown format.' }
  }
}

function bitsToRuns(bits: number[]): number[] {
  if (bits.length === 0) return []
  const runs: number[] = []
  let current = bits[0]
  let count = 0
  for (const bit of bits) {
    if (bit === current) count += 1
    else {
      runs.push(count)
      current = bit
      count = 1
    }
  }
  runs.push(count)
  return runs
}

function pushPattern(bits: number[], pattern: string) {
  for (const ch of pattern) bits.push(ch === '1' ? 1 : 0)
}

function encodeEan13(payload: string): number[] {
  const bits: number[] = []
  pushPattern(bits, '101')
  const parity = PARITY[payload[0]]
  for (let i = 1; i <= 6; i += 1) {
    const digit = payload[i]
    pushPattern(bits, parity[i - 1] === 'L' ? L[digit] : G[digit])
  }
  pushPattern(bits, '01010')
  for (let i = 7; i <= 12; i += 1) pushPattern(bits, R[payload[i]])
  pushPattern(bits, '101')
  return bitsToRuns(bits)
}

function encodeCode39(payload: string): number[] {
  const body = `*${payload}*`
  const modules: number[] = []
  for (let i = 0; i < body.length; i += 1) {
    const pattern = CODE39[body[i]]
    if (!pattern) throw new Error(`Unsupported character "${body[i]}"`)
    for (const el of pattern) modules.push(el === 'w' ? 3 : 1)
    if (i < body.length - 1) modules.push(1)
  }
  return modules
}

function encodeCode128B(payload: string): number[] {
  const codes: number[] = [104]
  for (const ch of payload) {
    const code = ch.charCodeAt(0) - 32
    if (code < 0 || code > 94) throw new Error(`Unsupported character "${ch}"`)
    codes.push(code)
  }
  let checksum = codes[0]
  for (let i = 1; i < codes.length; i += 1) checksum += codes[i] * i
  codes.push(checksum % 103)
  codes.push(106)
  const modules: number[] = []
  for (const code of codes) {
    for (const ch of C128[code]) modules.push(Number(ch))
  }
  return modules
}

function drawModules(modules: number[], style: BarcodeStyle, label: string): BarcodeSvg {
  const total = modules.reduce((a, b) => a + b, 0)
  const width = total * style.moduleWidth + style.margin * 2
  const barHeight = style.height
  const textHeight = style.displayValue ? style.fontSize + 8 : 0
  const height = barHeight + style.margin * 2 + textHeight
  let x = style.margin
  let drawBar = true
  const rects: string[] = []
  for (const w of modules) {
    const moduleW = w * style.moduleWidth
    if (drawBar) rects.push(`<rect x="${x}" y="${style.margin}" width="${moduleW}" height="${barHeight}" fill="${style.lineColor}"/>`)
    x += moduleW
    drawBar = !drawBar
  }
  const text = style.displayValue
    ? `<text x="${width / 2}" y="${height - style.margin - 2}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="${style.fontSize}" fill="${style.lineColor}">${escapeXml(label)}</text>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${style.background}"/>${rects.join('')}${text}</svg>`
  return { svg, width, height, payload: label }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

export function createBarcodeSvg(format: BarcodeFormat, text: string, style: BarcodeStyle): BarcodeResult {
  const validated = validateBarcode(format, text)
  if (!validated.ok) return validated
  if (!('payload' in validated)) return validated
  try {
    const payload = validated.payload
    const modules =
      format === 'EAN13'
        ? encodeEan13(payload)
        : format === 'UPC'
          ? encodeEan13(`0${payload}`)
          : format === 'CODE39'
            ? encodeCode39(payload)
            : encodeCode128B(payload)
    return { ok: true, value: drawModules(modules, style, payload) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not encode barcode.' }
  }
}
