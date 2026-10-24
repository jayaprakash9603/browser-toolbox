export type QrResult<T> = { ok: true; value: T } | { ok: false; error: string }

export type QrPreset =
  | 'text'
  | 'url'
  | 'wifi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'contact'
  | 'geo'
  | 'event'

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H'

export interface WifiOptions {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}

function escapeWifiField(value: string): string {
  return value.replace(/([\\;,:"'])/g, '\\$1')
}

export function buildWifiPayload({ ssid, password, encryption, hidden }: WifiOptions): string {
  const parts = [`T:${encryption}`, `S:${escapeWifiField(ssid)}`]
  if (encryption !== 'nopass') parts.push(`P:${escapeWifiField(password)}`)
  if (hidden) parts.push('H:true')
  return `WIFI:${parts.join(';')};;`
}

export interface EmailOptions {
  to: string
  subject?: string
  body?: string
}

export function buildEmailPayload({ to, subject, body }: EmailOptions): string {
  const params = new URLSearchParams()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  const query = params.toString()
  return `mailto:${to}${query ? `?${query}` : ''}`
}

export function buildPhonePayload(phone: string): string {
  return `tel:${phone.replace(/[\s()-]/g, '')}`
}

export function buildSmsPayload({ phone, message }: { phone: string; message?: string }): string {
  const number = phone.replace(/[\s()-]/g, '')
  return message ? `SMSTO:${number}:${message}` : `SMSTO:${number}`
}

export function buildGeoPayload({ lat, lng }: { lat: string; lng: string }): string | null {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (lat.trim() === '' || lng.trim() === '') return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return `geo:${latitude},${longitude}`
}

export interface EventOptions {
  title: string
  /** `YYYY-MM-DDTHH:mm` as produced by `<input type="datetime-local">`. */
  start: string
  end?: string
  location?: string
}

function escapeIcsText(value: string): string {
  return value.replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

function toIcsDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [, y, mo, d, h, mi] = match
  return `${y}${mo}${d}T${h}${mi}00`
}

export function buildEventPayload({ title, start, end, location }: EventOptions): string {
  const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeIcsText(title)}`]
  const dtStart = toIcsDate(start)
  const dtEnd = end ? toIcsDate(end) : null
  if (dtStart) lines.push(`DTSTART:${dtStart}`)
  if (dtEnd) lines.push(`DTEND:${dtEnd}`)
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export interface ContactOptions {
  firstName: string
  lastName?: string
  phone?: string
  email?: string
  organization?: string
  url?: string
}

export function buildContactPayload(options: ContactOptions): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${options.lastName ?? ''};${options.firstName};;;`,
    `FN:${[options.firstName, options.lastName].filter(Boolean).join(' ')}`,
  ]
  if (options.organization) lines.push(`ORG:${options.organization}`)
  if (options.phone) lines.push(`TEL;TYPE=CELL:${options.phone}`)
  if (options.email) lines.push(`EMAIL:${options.email}`)
  if (options.url) lines.push(`URL:${options.url}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

export function normalizeQrInput(input: string): string {
  const trimmed = input.trim()
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

export async function generateQrDataUrl(payload: string, size = 256): Promise<QrResult<string>> {
  if (!payload.trim()) return { ok: false, error: 'Payload is empty.' }
  try {
    const qrcode = await import('qrcode')
    const value = await qrcode.toDataURL(payload, {
      width: Math.min(Math.max(64, size), 1024),
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    return { ok: true, value }
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : 'Could not generate the QR code.',
    }
  }
}

export async function generateQrSvg(payload: string): Promise<QrResult<string>> {
  if (!payload.trim()) return { ok: false, error: 'Payload is empty.' }
  try {
    const qrcode = await import('qrcode')
    return { ok: true, value: await qrcode.toString(payload, { type: 'svg', margin: 2 }) }
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : 'Could not generate the QR code.',
    }
  }
}

export interface QrMatrix {
  size: number
  version: number
  /** Row-major, one entry per module; truthy means dark. */
  data: Uint8Array
}

/** Largest byte-mode payload a version 40 symbol holds at each error-correction level. */
export const QR_BYTE_CAPACITY: Record<QrErrorCorrection, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
}

export async function createQrMatrix(
  payload: string,
  errorCorrectionLevel: QrErrorCorrection = 'M',
): Promise<QrResult<QrMatrix>> {
  if (!payload) return { ok: false, error: 'Payload is empty.' }
  try {
    const qrcode = await import('qrcode')
    const code = qrcode.create(payload, { errorCorrectionLevel })
    return {
      ok: true,
      value: { size: code.modules.size, version: code.version, data: code.modules.data },
    }
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : 'Could not generate the QR code.',
    }
  }
}

export interface QrImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface QrPoint {
  x: number
  y: number
}

export interface QrDecodeResult {
  data: string
  /** Clockwise from top-left, in image pixels. */
  corners: [QrPoint, QrPoint, QrPoint, QrPoint]
}

export async function decodeQrWithLocation(image: QrImageData): Promise<QrResult<QrDecodeResult>> {
  try {
    const { default: jsQR } = await import('jsqr')
    const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })
    if (!result) return { ok: false, error: 'No QR code found in this image.' }
    const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = result.location
    return {
      ok: true,
      value: {
        data: result.data,
        corners: [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner],
      },
    }
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof Error ? cause.message : 'Could not decode the image.',
    }
  }
}

export async function decodeQrFromImage(image: QrImageData): Promise<QrResult<string>> {
  const result = await decodeQrWithLocation(image)
  return result.ok ? { ok: true, value: result.value.data } : result
}

export interface ParsedQrContent {
  kind: QrPreset
  /** Human-facing fields in display order; empty values are omitted. */
  fields: { key: string; value: string }[]
}

function unescapeField(value: string): string {
  return value.replace(/\\(.)/g, '$1')
}

function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = []
  let current = ''
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]
    if (char === '\\' && i + 1 < value.length) {
      current += char + value[i + 1]
      i += 1
    } else if (char === separator) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts
}

function lineValue(lines: string[], name: string): string {
  const line = lines.find((l) => l.toUpperCase().startsWith(name))
  if (!line) return ''
  return line.slice(line.indexOf(':') + 1).trim()
}

function fromIcsDate(value: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(value)
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}` : value
}

function compact(fields: { key: string; value: string }[]) {
  return fields.filter((f) => f.value !== '')
}

/** Recognises the payload formats the generator produces, plus common variants. */
export function parseQrContent(raw: string): ParsedQrContent {
  const text = raw.trim()
  const upper = text.toUpperCase()

  if (upper.startsWith('WIFI:')) {
    const fields: Record<string, string> = {}
    for (const part of splitEscaped(text.slice(5), ';')) {
      const index = part.indexOf(':')
      if (index > 0) fields[part.slice(0, index).toUpperCase()] = unescapeField(part.slice(index + 1))
    }
    return {
      kind: 'wifi',
      fields: compact([
        { key: 'ssid', value: fields.S ?? '' },
        { key: 'password', value: fields.P ?? '' },
        { key: 'encryption', value: fields.T || 'nopass' },
        { key: 'hidden', value: fields.H === 'true' ? 'true' : '' },
      ]),
    }
  }

  if (upper.startsWith('MAILTO:')) {
    const [address, query = ''] = text.slice(7).split('?')
    const params = new URLSearchParams(query)
    return {
      kind: 'email',
      fields: compact([
        { key: 'to', value: decodeURIComponent(address) },
        { key: 'subject', value: params.get('subject') ?? '' },
        { key: 'body', value: params.get('body') ?? '' },
      ]),
    }
  }

  if (upper.startsWith('TEL:')) {
    return { kind: 'phone', fields: [{ key: 'phone', value: text.slice(4) }] }
  }

  if (upper.startsWith('SMSTO:') || upper.startsWith('SMS:')) {
    const body = text.slice(text.indexOf(':') + 1)
    const index = body.indexOf(':')
    const [phone, message] = index >= 0 ? [body.slice(0, index), body.slice(index + 1)] : [body, '']
    return {
      kind: 'sms',
      fields: compact([
        { key: 'phone', value: phone.split('?')[0] },
        { key: 'message', value: message },
      ]),
    }
  }

  if (upper.startsWith('GEO:')) {
    const [lat = '', lng = ''] = text.slice(4).split(/[?;]/)[0].split(',')
    return {
      kind: 'geo',
      fields: compact([
        { key: 'lat', value: lat.trim() },
        { key: 'lng', value: lng.trim() },
      ]),
    }
  }

  if (upper.startsWith('BEGIN:VCARD')) {
    const lines = text.split(/\r?\n/)
    const [last = '', first = ''] = lineValue(lines, 'N:').split(';')
    return {
      kind: 'contact',
      fields: compact([
        { key: 'firstName', value: first || lineValue(lines, 'FN:') },
        { key: 'lastName', value: last },
        { key: 'phone', value: lineValue(lines, 'TEL') },
        { key: 'email', value: lineValue(lines, 'EMAIL') },
        { key: 'organization', value: lineValue(lines, 'ORG') },
        { key: 'url', value: lineValue(lines, 'URL') },
      ]),
    }
  }

  if (upper.includes('BEGIN:VEVENT')) {
    const lines = text.split(/\r?\n/)
    const ics = (name: string) => unescapeField(lineValue(lines, name).replace(/\\n/g, '\n'))
    return {
      kind: 'event',
      fields: compact([
        { key: 'title', value: ics('SUMMARY') },
        { key: 'start', value: fromIcsDate(lineValue(lines, 'DTSTART')) },
        { key: 'end', value: fromIcsDate(lineValue(lines, 'DTEND')) },
        { key: 'location', value: ics('LOCATION') },
      ]),
    }
  }

  if (/^https?:\/\/\S+$/i.test(text)) {
    return { kind: 'url', fields: [{ key: 'url', value: text }] }
  }

  return { kind: 'text', fields: [{ key: 'text', value: text }] }
}
