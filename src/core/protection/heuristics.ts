export type RiskLevel = 'none' | 'low' | 'high'

export interface PageSignals {
  host: string
  protocol: string
  hasPassword: boolean
  formActions: string[]
  title: string
}

export interface RiskVerdict {
  level: RiskLevel
  reason?: string
  brand?: string
}

const MULTI_PART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.in',
  'com.br',
  'com.mx',
  'co.jp',
  'co.kr',
  'com.tr',
  'com.sg',
  'com.hk',
])

/** Brand label -> official registrable domains (not exhaustive; reduces false positives). */
export const BRAND_OFFICIAL: Record<string, string[]> = {
  paypal: ['paypal.com'],
  apple: ['apple.com', 'icloud.com'],
  microsoft: ['microsoft.com', 'live.com', 'office.com', 'office365.com', 'outlook.com'],
  office: ['microsoft.com', 'office.com', 'office365.com'],
  outlook: ['outlook.com', 'live.com', 'microsoft.com'],
  google: ['google.com', 'google.co.uk', 'googleapis.com', 'gmail.com'],
  gmail: ['gmail.com', 'google.com'],
  amazon: ['amazon.com', 'amazon.co.uk', 'amazon.in', 'aws.amazon.com'],
  netflix: ['netflix.com'],
  facebook: ['facebook.com', 'fb.com', 'meta.com'],
  instagram: ['instagram.com'],
  whatsapp: ['whatsapp.com'],
  meta: ['meta.com', 'facebook.com'],
  coinbase: ['coinbase.com'],
  binance: ['binance.com'],
  metamask: ['metamask.io'],
  stripe: ['stripe.com'],
  sbi: ['sbi.co.in', 'onlinesbi.sbi'],
  hdfcbank: ['hdfcbank.com'],
  icicibank: ['icicibank.com'],
  paytm: ['paytm.com'],
  chase: ['chase.com'],
  bankofamerica: ['bankofamerica.com'],
}

export function registrableDomain(host: string): string {
  const h = host.replace(/^www\./, '').toLowerCase()
  const parts = h.split('.')
  if (parts.length < 2) return h
  for (const suffix of MULTI_PART_SUFFIXES) {
    const suffixParts = suffix.split('.')
    if (parts.length > suffixParts.length) {
      const tail = parts.slice(-suffixParts.length).join('.')
      if (tail === suffix) {
        return parts.slice(-(suffixParts.length + 1)).join('.')
      }
    }
  }
  return parts.slice(-2).join('.')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const row = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = temp
    }
  }
  return row[n]
}

function hostContainsBrand(host: string, brand: string): boolean {
  const labels = host.split('.')
  return labels.some((label) => label === brand || label.includes(brand))
}

function isOfficialDomain(registrable: string, official: string[]): boolean {
  return official.some((o) => registrable === o || registrable.endsWith(`.${o}`))
}

function punycodeLooksLikeBrand(host: string): string | null {
  if (!host.includes('xn--')) return null
  try {
    const ascii = new URL(`http://${host}`).hostname
    for (const brand of Object.keys(BRAND_OFFICIAL)) {
      if (ascii.includes(brand)) return brand
    }
  } catch {
    /* invalid host */
  }
  return null
}

function typosquatBrand(host: string): string | null {
  const registrable = registrableDomain(host)
  const label = registrable.split('.')[0]
  if (label.length < 4) return null
  for (const brand of Object.keys(BRAND_OFFICIAL)) {
    if (label === brand) continue
    if (levenshtein(label, brand) === 1) return brand
  }
  return null
}

export function assessPage(signals: PageSignals): RiskVerdict {
  if (!signals.hasPassword) return { level: 'none' }

  const host = signals.host.replace(/^www\./, '').toLowerCase()
  const registrable = registrableDomain(host)

  const punyBrand = punycodeLooksLikeBrand(host)
  if (punyBrand) {
    return {
      level: 'high',
      brand: punyBrand,
      reason: 'punycode',
    }
  }

  const typoBrand = typosquatBrand(host)
  if (typoBrand && !isOfficialDomain(registrable, BRAND_OFFICIAL[typoBrand] ?? [])) {
    return {
      level: 'high',
      brand: typoBrand,
      reason: 'typosquat',
    }
  }

  for (const [brand, official] of Object.entries(BRAND_OFFICIAL)) {
    if (!hostContainsBrand(host, brand)) continue
    if (!isOfficialDomain(registrable, official)) {
      return {
        level: 'high',
        brand,
        reason: 'brand_impersonation',
      }
    }
  }

  if (signals.protocol === 'http:') {
    return { level: 'low', reason: 'http_password' }
  }

  for (const action of signals.formActions) {
    try {
      const actionHost = new URL(action, `https://${host}`).hostname
      const actionReg = registrableDomain(actionHost)
      if (actionReg !== registrable) {
        return { level: 'low', reason: 'cross_domain_form' }
      }
    } catch {
      /* ignore bad action URLs */
    }
  }

  const titleLower = signals.title.toLowerCase()
  for (const brand of Object.keys(BRAND_OFFICIAL)) {
    if (titleLower.includes(brand) && !hostContainsBrand(host, brand)) {
      return { level: 'low', reason: 'title_brand_mismatch' }
    }
  }

  return { level: 'none' }
}
