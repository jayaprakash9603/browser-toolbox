import {
  buildContactPayload,
  buildEmailPayload,
  buildEventPayload,
  buildGeoPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildWifiPayload,
  normalizeQrInput,
  type ParsedQrContent,
  type QrErrorCorrection,
  type QrMatrix,
  type QrPreset,
} from '@/core/engines/qrcode'

export const PRESETS: QrPreset[] = [
  'text',
  'url',
  'wifi',
  'email',
  'phone',
  'sms',
  'contact',
  'geo',
  'event',
]

export interface QrForm {
  text: string
  url: string
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
  hidden: boolean
  emailTo: string
  emailSubject: string
  emailBody: string
  phone: string
  smsPhone: string
  smsMessage: string
  firstName: string
  lastName: string
  contactPhone: string
  contactEmail: string
  organization: string
  contactUrl: string
  lat: string
  lng: string
  eventTitle: string
  eventStart: string
  eventEnd: string
  eventLocation: string
}

export const EMPTY_FORM: QrForm = {
  text: '',
  url: '',
  ssid: '',
  password: '',
  encryption: 'WPA',
  hidden: false,
  emailTo: '',
  emailSubject: '',
  emailBody: '',
  phone: '',
  smsPhone: '',
  smsMessage: '',
  firstName: '',
  lastName: '',
  contactPhone: '',
  contactEmail: '',
  organization: '',
  contactUrl: '',
  lat: '',
  lng: '',
  eventTitle: '',
  eventStart: '',
  eventEnd: '',
  eventLocation: '',
}

/** Returns an empty string while there is nothing meaningful to encode. */
export function buildQrPayload(preset: QrPreset, form: QrForm): string {
  switch (preset) {
    case 'text':
      return form.text.trim() ? form.text : ''
    case 'url':
      return normalizeQrInput(form.url)
    case 'wifi':
      return form.ssid.trim()
        ? buildWifiPayload({
            ssid: form.ssid,
            password: form.password,
            encryption: form.encryption,
            hidden: form.hidden,
          })
        : ''
    case 'email':
      return form.emailTo.trim()
        ? buildEmailPayload({ to: form.emailTo.trim(), subject: form.emailSubject, body: form.emailBody })
        : ''
    case 'phone':
      return form.phone.trim() ? buildPhonePayload(form.phone) : ''
    case 'sms':
      return form.smsPhone.trim() ? buildSmsPayload({ phone: form.smsPhone, message: form.smsMessage }) : ''
    case 'contact':
      return form.firstName.trim() || form.lastName.trim() || form.contactPhone.trim() || form.contactEmail.trim()
        ? buildContactPayload({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            phone: form.contactPhone.trim() || undefined,
            email: form.contactEmail.trim() || undefined,
            organization: form.organization.trim() || undefined,
            url: form.contactUrl.trim() || undefined,
          })
        : ''
    case 'geo':
      return buildGeoPayload({ lat: form.lat, lng: form.lng }) ?? ''
    case 'event':
      return form.eventTitle.trim()
        ? buildEventPayload({
            title: form.eventTitle.trim(),
            start: form.eventStart,
            end: form.eventEnd || undefined,
            location: form.eventLocation.trim() || undefined,
          })
        : ''
  }
}

const FIELD_TO_FORM: Record<QrPreset, Record<string, keyof QrForm>> = {
  text: { text: 'text' },
  url: { url: 'url' },
  wifi: { ssid: 'ssid', password: 'password', encryption: 'encryption', hidden: 'hidden' },
  email: { to: 'emailTo', subject: 'emailSubject', body: 'emailBody' },
  phone: { phone: 'phone' },
  sms: { phone: 'smsPhone', message: 'smsMessage' },
  contact: {
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'contactPhone',
    email: 'contactEmail',
    organization: 'organization',
    url: 'contactUrl',
  },
  geo: { lat: 'lat', lng: 'lng' },
  event: { title: 'eventTitle', start: 'eventStart', end: 'eventEnd', location: 'eventLocation' },
}

/** Maps decoded content back onto generator fields so a scanned code can be edited. */
export function parsedToForm(parsed: ParsedQrContent): Partial<QrForm> {
  const map = FIELD_TO_FORM[parsed.kind]
  const patch: Record<string, string | boolean> = {}
  for (const { key, value } of parsed.fields) {
    const target = map[key]
    if (!target) continue
    if (target === 'hidden') patch.hidden = value === 'true'
    else if (target === 'encryption') patch.encryption = value === 'WEP' || value === 'nopass' ? value : 'WPA'
    else patch[target] = value
  }
  return patch as Partial<QrForm>
}

export type ModuleShape = 'square' | 'rounded' | 'fluid' | 'dots'
export type EyeShape = 'square' | 'rounded' | 'circle' | 'leaf'
export type GradientKind = 'none' | 'linear' | 'radial'

export interface QrStyle {
  moduleShape: ModuleShape
  eyeShape: EyeShape
  fg: string
  fg2: string
  gradient: GradientKind
  /** `null` paints the eyes with the module fill. */
  eyeColor: string | null
  bg: string
  transparent: boolean
  margin: number
  ecl: QrErrorCorrection
  logoScale: number
  showLabel: boolean
  label: string
}

export const DEFAULT_STYLE: QrStyle = {
  moduleShape: 'square',
  eyeShape: 'square',
  fg: '#0f172a',
  fg2: '#4f46e5',
  gradient: 'none',
  eyeColor: null,
  bg: '#ffffff',
  transparent: false,
  margin: 2,
  ecl: 'M',
  logoScale: 0.22,
  showLabel: false,
  label: 'SCAN ME',
}

export interface ColorTheme {
  id: string
  fg: string
  fg2: string
  gradient: GradientKind
  bg: string
  eyeColor: string | null
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: 'classic', fg: '#0f172a', fg2: '#0f172a', gradient: 'none', bg: '#ffffff', eyeColor: null },
  { id: 'ocean', fg: '#4f46e5', fg2: '#0891b2', gradient: 'linear', bg: '#ffffff', eyeColor: '#312e81' },
  { id: 'sunset', fg: '#ea580c', fg2: '#be185d', gradient: 'linear', bg: '#fffbf5', eyeColor: '#9d174d' },
  { id: 'forest', fg: '#15803d', fg2: '#064e3b', gradient: 'radial', bg: '#f7fdf9', eyeColor: '#064e3b' },
  { id: 'grape', fg: '#7c3aed', fg2: '#c026d3', gradient: 'linear', bg: '#ffffff', eyeColor: '#4c1d95' },
  { id: 'ink', fg: '#1e293b', fg2: '#1e293b', gradient: 'none', bg: '#fef3c7', eyeColor: '#b45309' },
]

export function themeMatches(style: QrStyle, theme: ColorTheme): boolean {
  return (
    style.fg === theme.fg &&
    style.bg === theme.bg &&
    style.gradient === theme.gradient &&
    style.eyeColor === theme.eyeColor &&
    (theme.gradient === 'none' || style.fg2 === theme.fg2)
  )
}

function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.replace(/./g, '$&$&') : value
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export type ScanRisk = 'ok' | 'lowContrast' | 'inverted'

/** Scanners need dark modules on a light ground with clear separation. */
export function scanRisk(style: QrStyle): ScanRisk {
  if (style.transparent) return 'ok'
  const inks = [style.fg, ...(style.gradient === 'none' ? [] : [style.fg2]), ...(style.eyeColor ? [style.eyeColor] : [])]
  if (inks.some((ink) => luminance(ink) > luminance(style.bg))) return 'inverted'
  return Math.min(...inks.map((ink) => contrastRatio(ink, style.bg))) < 3 ? 'lowContrast' : 'ok'
}

const n = (value: number) => Math.round(value * 1000) / 1000

/** Rounded rectangle with per-corner radii [tl, tr, br, bl], drawn clockwise. */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: [number, number, number, number]): string {
  const [tl, tr, br, bl] = r
  return (
    `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}A${tr} ${tr} 0 0 1 ${n(x + w)} ${n(y + tr)}` +
    `V${n(y + h - br)}A${br} ${br} 0 0 1 ${n(x + w - br)} ${n(y + h)}` +
    `H${n(x + bl)}A${bl} ${bl} 0 0 1 ${n(x)} ${n(y + h - bl)}` +
    `V${n(y + tl)}A${tl} ${tl} 0 0 1 ${n(x + tl)} ${n(y)}Z`
  )
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${n(r * 2)} 0a${r} ${r} 0 1 0 ${n(-r * 2)} 0Z`
}

function eyeRing(shape: EyeShape, x: number, y: number): string {
  switch (shape) {
    case 'square':
      return roundedRectPath(x, y, 7, 7, [0, 0, 0, 0]) + roundedRectPath(x + 1, y + 1, 5, 5, [0, 0, 0, 0])
    case 'rounded':
      return roundedRectPath(x, y, 7, 7, [2, 2, 2, 2]) + roundedRectPath(x + 1, y + 1, 5, 5, [1.2, 1.2, 1.2, 1.2])
    case 'circle':
      return circlePath(x + 3.5, y + 3.5, 3.5) + circlePath(x + 3.5, y + 3.5, 2.5)
    case 'leaf':
      return roundedRectPath(x, y, 7, 7, [3, 0, 3, 0]) + roundedRectPath(x + 1, y + 1, 5, 5, [2, 0, 2, 0])
  }
}

function eyePupil(shape: EyeShape, x: number, y: number): string {
  switch (shape) {
    case 'square':
      return roundedRectPath(x + 2, y + 2, 3, 3, [0, 0, 0, 0])
    case 'rounded':
      return roundedRectPath(x + 2, y + 2, 3, 3, [0.9, 0.9, 0.9, 0.9])
    case 'circle':
      return circlePath(x + 3.5, y + 3.5, 1.5)
    case 'leaf':
      return roundedRectPath(x + 2, y + 2, 3, 3, [1.5, 0, 1.5, 0])
  }
}

export interface QrGeometry {
  /** Width of the square code area including the quiet zone. */
  width: number
  /** Total height, which grows when a caption is shown. */
  height: number
  body: string
  eyes: { ring: string; pupil: string; cx: number; cy: number }[]
  logo: { x: number; y: number; size: number } | null
  label: { y: number; fontSize: number } | null
}

export function buildQrGeometry(
  matrix: QrMatrix,
  style: Pick<QrStyle, 'moduleShape' | 'eyeShape' | 'margin' | 'logoScale' | 'showLabel' | 'label'>,
  withLogo: boolean,
): QrGeometry {
  const { size, data } = matrix
  const m = style.margin
  const width = size + m * 2

  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)

  let logo: QrGeometry['logo'] = null
  let hole: { from: number; to: number } | null = null
  if (withLogo) {
    let span = Math.round(size * style.logoScale)
    if (span % 2 !== size % 2) span += 1
    const from = (size - span) / 2
    hole = { from, to: from + span }
    logo = { x: from + m, y: from + m, size: span }
  }
  const inHole = (r: number, c: number) =>
    hole !== null && r >= hole.from && r < hole.to && c >= hole.from && c < hole.to

  const dark = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < size && c < size && data[r * size + c] !== 0 && !inFinder(r, c) && !inHole(r, c)

  let body = ''
  for (let r = 0; r < size; r += 1) {
    if (style.moduleShape === 'square') {
      let c = 0
      while (c < size) {
        if (!dark(r, c)) {
          c += 1
          continue
        }
        const start = c
        while (c < size && dark(r, c)) c += 1
        body += `M${start + m} ${r + m}h${c - start}v1h${start - c}Z`
      }
      continue
    }
    for (let c = 0; c < size; c += 1) {
      if (!dark(r, c)) continue
      const x = c + m
      const y = r + m
      if (style.moduleShape === 'dots') {
        body += circlePath(x + 0.5, y + 0.5, 0.45)
      } else if (style.moduleShape === 'rounded') {
        body += roundedRectPath(x + 0.08, y + 0.08, 0.84, 0.84, [0.3, 0.3, 0.3, 0.3])
      } else {
        const up = dark(r - 1, c)
        const down = dark(r + 1, c)
        const left = dark(r, c - 1)
        const right = dark(r, c + 1)
        body += roundedRectPath(x, y, 1, 1, [
          !up && !left ? 0.5 : 0,
          !up && !right ? 0.5 : 0,
          !down && !right ? 0.5 : 0,
          !down && !left ? 0.5 : 0,
        ])
      }
    }
  }

  const origins: [number, number][] = [
    [m, m],
    [size - 7 + m, m],
    [m, size - 7 + m],
  ]
  const eyes = origins.map(([x, y]) => ({
    ring: eyeRing(style.eyeShape, x, y),
    pupil: eyePupil(style.eyeShape, x, y),
    cx: x + 3.5,
    cy: y + 3.5,
  }))

  const caption = style.showLabel && style.label.trim()
  const labelBand = caption ? Math.max(4, width * 0.16) : 0
  return {
    width,
    height: width + labelBand,
    body,
    eyes,
    logo,
    label: caption ? { y: width + labelBand * 0.42, fontSize: labelBand * 0.5 } : null,
  }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}

/** Standalone SVG document matching what the preview draws. */
export function buildQrSvg(geometry: QrGeometry, style: QrStyle, logoDataUrl: string | null): string {
  const { width, height } = geometry
  const ink = style.gradient === 'none' ? style.fg : 'url(#qr-ink)'
  const eyeInk = style.eyeColor ?? ink
  const gradient =
    style.gradient === 'linear'
      ? `<linearGradient id="qr-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${width}" y2="${width}"><stop offset="0" stop-color="${style.fg}"/><stop offset="1" stop-color="${style.fg2}"/></linearGradient>`
      : style.gradient === 'radial'
        ? `<radialGradient id="qr-ink" gradientUnits="userSpaceOnUse" cx="${width / 2}" cy="${width / 2}" r="${n(width * 0.7)}"><stop offset="0" stop-color="${style.fg}"/><stop offset="1" stop-color="${style.fg2}"/></radialGradient>`
        : ''
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${n(height)}" width="${width * 10}" height="${n(height * 10)}" shape-rendering="geometricPrecision">`,
    gradient ? `<defs>${gradient}</defs>` : '',
    style.transparent ? '' : `<rect width="${width}" height="${n(height)}" fill="${style.bg}"/>`,
    `<path d="${geometry.body}" fill="${ink}"/>`,
    ...geometry.eyes.map(
      (eye) => `<path d="${eye.ring}" fill="${eyeInk}" fill-rule="evenodd"/><path d="${eye.pupil}" fill="${eyeInk}"/>`,
    ),
  ]
  if (geometry.logo && logoDataUrl) {
    const { x, y, size } = geometry.logo
    if (!style.transparent) {
      parts.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${n(size * 0.18)}" fill="${style.bg}"/>`)
    }
    const pad = size * 0.12
    parts.push(
      `<image href="${logoDataUrl}" x="${n(x + pad)}" y="${n(y + pad)}" width="${n(size - pad * 2)}" height="${n(size - pad * 2)}" preserveAspectRatio="xMidYMid meet"/>`,
    )
  }
  if (geometry.label) {
    parts.push(
      `<text x="${width / 2}" y="${n(geometry.label.y)}" font-size="${n(geometry.label.fontSize)}" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="700" letter-spacing="${n(geometry.label.fontSize * 0.08)}" text-anchor="middle" dominant-baseline="middle" fill="${eyeInk}">${escapeXml(style.label.trim())}</text>`,
    )
  }
  parts.push('</svg>')
  return parts.join('')
}

export async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width)
    canvas.height = Math.round(height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable.')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode PNG.'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

const STYLE_KEY = 'qr-toolkit:style'

export function loadStyle(): QrStyle {
  try {
    const raw = localStorage.getItem(STYLE_KEY)
    return raw ? { ...DEFAULT_STYLE, ...(JSON.parse(raw) as Partial<QrStyle>) } : DEFAULT_STYLE
  } catch {
    return DEFAULT_STYLE
  }
}

export function saveStyle(style: QrStyle): void {
  try {
    localStorage.setItem(STYLE_KEY, JSON.stringify(style))
  } catch {
    // Storage can be full or unavailable; the style simply won't persist.
  }
}
