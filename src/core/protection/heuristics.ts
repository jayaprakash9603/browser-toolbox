import { registrableDomain } from './domain'

export { registrableDomain }

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

/** Wording typical of fake virus alerts and "call support" browser lockers. */
const SCAM_PHRASES = [
  /windows defender (security )?(warning|alert)/i,
  /(your )?(computer|pc|device|system|browser) (has been|is|was) (locked|blocked|infected|compromised|hacked)/i,
  /call (microsoft|apple|windows|amazon|paypal) (support|help|technicians?|helpline)/i,
  /(microsoft|windows|apple) (technical )?support (team|number|helpline)/i,
  /do not (close|restart|shut ?down|turn off) (this (window|page)|your (computer|pc|device)|the browser)/i,
  /(trojan|spyware|virus|malware|ransomware|pornographic spyware)[^.]{0,30}(detected|alert|infection|found)/i,
  /access to this (pc|computer|device) has been blocked/i,
  /(firewall|security) (alert|warning)[^.]{0,20}(call|contact)/i,
  /error (code|#)[:\s#]*[a-z0-9]{5,}/i,
  /your (personal|banking|credit card) (data|information|details) (is|are|may be) (at risk|being stolen|stolen)/i,
]

const PHONE_NUMBER =
  /(toll[- ]?free|\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{3,4})/i

/** Official vendor domains that legitimately talk about viruses and support numbers. */
const SCAM_TEXT_EXEMPT = [
  'microsoft.com',
  'apple.com',
  'support.google.com',
  'malwarebytes.com',
  'norton.com',
  'mcafee.com',
  'kaspersky.com',
  'avast.com',
  'bitdefender.com',
  'eset.com',
  'wikipedia.org',
]

/** Fake "your computer is infected, call this number" pages. */
export function assessScamText(host: string, title: string, text: string): RiskVerdict {
  const registrable = registrableDomain(host)
  if (SCAM_TEXT_EXEMPT.some((d) => registrable === d || host.endsWith(`.${d}`) || host === d)) {
    return { level: 'none' }
  }
  const sample = `${title}\n${text}`.slice(0, 20_000)
  const hits = SCAM_PHRASES.filter((re) => re.test(sample)).length
  const phone = PHONE_NUMBER.test(sample)
  if ((hits >= 2 && phone) || hits >= 3) return { level: 'high', reason: 'tech_support_scam' }
  return { level: 'none' }
}

/**
 * Commands that "fake CAPTCHA / ClickFix" pages copy to the clipboard and then ask the user
 * to paste into Win+R, Terminal or PowerShell.
 */
const SHELL_COMMAND_PATTERNS = [
  /\b(powershell|pwsh)(\.exe)?\b/i,
  /\bcmd(\.exe)?\s+\/[ck]\b/i,
  /\b(mshta|rundll32|regsvr32|certutil|bitsadmin|wscript|cscript|msiexec)(\.exe)?\b/i,
  /\b(iex|invoke-expression|invoke-webrequest|iwr|downloadstring|frombase64string|start-process)\b/i,
  /-e(nc(odedcommand)?)?\s+[a-z0-9+/=]{20,}/i,
  /\b(curl|wget)\b[^\n|]*\|\s*(ba|z)?sh\b/i,
  /\bbash\s+-c\b/i,
  /\bosascript\b/i,
  /\bbase64\s+(-d|--decode)\b[^\n]*\|/i,
]

export function looksLikeShellCommand(text: string): boolean {
  const sample = text.slice(0, 4000)
  return SHELL_COMMAND_PATTERNS.some((re) => re.test(sample))
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
