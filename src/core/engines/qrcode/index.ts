export type QrResult<T> = { ok: true; value: T } | { ok: false; error: string }

export type QrPreset = 'text' | 'url' | 'wifi' | 'email' | 'phone' | 'contact'

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
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not generate the QR code.' }
  }
}

export async function generateQrSvg(payload: string): Promise<QrResult<string>> {
  if (!payload.trim()) return { ok: false, error: 'Payload is empty.' }
  try {
    const qrcode = await import('qrcode')
    return { ok: true, value: await qrcode.toString(payload, { type: 'svg', margin: 2 }) }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not generate the QR code.' }
  }
}

export interface QrImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

export async function decodeQrFromImage(image: QrImageData): Promise<QrResult<string>> {
  try {
    const { default: jsQR } = await import('jsqr')
    const result = jsQR(image.data, image.width, image.height)
    if (!result) return { ok: false, error: 'No QR code found in this image.' }
    return { ok: true, value: result.data }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Could not decode the image.' }
  }
}
