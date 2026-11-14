import { registrableDomain } from '@/core/protection/domain'

import type { SecuritySeverity, URLScanResult, UrlScanFinding, UrlScanState } from './types'

const SHORTENERS = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'rb.gy',
  'shorturl.at',
  'lnkd.in',
  'youtu.be',
])

const SUSPICIOUS_PORTS = new Set([21, 22, 23, 25, 445, 3389, 5900, 6667, 8080, 8443, 10443])

const IP_HOST = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[0-9a-f:]+\]?$/i

function finding(
  id: string,
  name: string,
  severity: SecuritySeverity,
  evidence: string,
  recommendation: string,
): UrlScanFinding {
  return { id, name, severity, evidence, recommendation }
}

function worstState(findings: UrlScanFinding[]): UrlScanState {
  if (findings.some((item) => item.severity === 'critical' || item.severity === 'high')) return 'suspicious'
  if (findings.length) return 'suspicious'
  return 'no_known_issue'
}

function worstSeverity(findings: UrlScanFinding[]): SecuritySeverity {
  for (const level of ['critical', 'high', 'medium', 'low', 'info'] as const) {
    if (findings.some((item) => item.severity === level)) return level
  }
  return 'info'
}

export function scanUrlLocal(raw: string): URLScanResult {
  const trimmed = raw.trim()
  const findings: UrlScanFinding[] = []
  if (!trimmed) {
    return {
      url: '',
      domain: '',
      state: 'unknown',
      findings: [finding('empty', 'Empty URL', 'low', 'No URL was provided.', 'Enter a full http(s) URL.')],
      severity: 'low',
      confidence: 'high',
      recommendations: ['Enter a URL to inspect.'],
    }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
  } catch {
    return {
      url: trimmed,
      domain: '',
      state: 'unknown',
      findings: [finding('syntax', 'Invalid URL', 'medium', trimmed.slice(0, 200), 'Fix the URL syntax before trusting it.')],
      severity: 'medium',
      confidence: 'high',
      recommendations: ['The value is not a valid URL.'],
    }
  }

  const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const domain = registrableDomain(hostname)

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    findings.push(
      finding('scheme', 'Unusual URL scheme', 'medium', parsed.protocol, 'Prefer https:// websites.'),
    )
  } else if (parsed.protocol === 'http:') {
    findings.push(
      finding('http', 'Not HTTPS', 'medium', parsed.origin, 'The URL uses unencrypted HTTP.'),
    )
  }

  if (IP_HOST.test(hostname.replace(/^\[|\]$/g, ''))) {
    findings.push(
      finding('ip-host', 'IP address instead of hostname', 'high', hostname, 'Phishing pages sometimes skip a domain name.'),
    )
  }

  if (hostname.includes('xn--') || /[^\u0000-\u007f]/.test(hostname)) {
    findings.push(
      finding(
        'punycode',
        'Internationalized or punycode domain',
        'medium',
        hostname,
        'Lookalike characters can impersonate brands. Confirm the registrable domain.',
      ),
    )
  }

  const labels = hostname.split('.').filter(Boolean)
  if (labels.length >= 5) {
    findings.push(
      finding(
        'subdomains',
        'Excessive subdomains',
        'low',
        hostname,
        'Long subdomain chains are sometimes used to look like a trusted host.',
      ),
    )
  }

  if (/%[0-9a-f]{2}/i.test(parsed.href) && (parsed.href.match(/%/g) ?? []).length >= 4) {
    findings.push(
      finding('encoding', 'Heavy URL encoding', 'low', parsed.pathname.slice(0, 180), 'Encoded paths can hide the real destination.'),
    )
  }

  if (SHORTENERS.has(domain)) {
    findings.push(
      finding('shortener', 'URL shortener', 'medium', domain, 'Expand the short link before opening it if you do not trust the sender.'),
    )
  }

  if (parsed.port && SUSPICIOUS_PORTS.has(Number(parsed.port))) {
    findings.push(
      finding('port', 'Unusual port', 'medium', `${hostname}:${parsed.port}`, 'Confirm why this site uses a non-standard port.'),
    )
  }

  if (parsed.username || parsed.password) {
    findings.push(
      finding(
        'credentials',
        'Embedded credentials',
        'high',
        'The URL contains a username or password.',
        'Do not open URLs that embed login secrets.',
      ),
    )
  }

  const query = parsed.search.toLowerCase()
  if (/(password|passwd|token|session|redirect=https?%3a|next=https?%3a)/i.test(query)) {
    findings.push(
      finding(
        'query',
        'Suspicious query parameters',
        'medium',
        parsed.search.slice(0, 180),
        'Query strings that carry tokens or nested redirects deserve extra care.',
      ),
    )
  }

  const state = worstState(findings)
  return {
    url: parsed.href,
    domain,
    state,
    findings,
    severity: worstSeverity(findings),
    confidence: 'high',
    recommendations: findings.length
      ? findings.map((item) => item.recommendation)
      : ['No local indicators fired. This is not a guarantee the URL is safe.'],
  }
}
