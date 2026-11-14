import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isSupplementalRuleId } from '@/core/adblock/filterLists/apply'
import { INTERCEPTOR_RULE_ID_BASE, INTERCEPTOR_RULE_ID_MAX } from '@/core/interceptor'
import { isInterceptorRuleId } from '@/core/interceptor/toDnr'
import { isProtectionManagedRuleId } from '@/core/protection'
import {
  AUDIT_HEADER_SPECS,
  CSC_BLOCKLIST_RULE_ID_BASE,
  CSC_BLOCKLIST_RULE_ID_MAX,
  HTTPS_UPGRADE_RULE_ID,
  TRACKER_CATALOG,
  appendSecurityEvent,
  auditHeaders,
  balancedPosture,
  breachNotConfigured,
  buildBlocklistRules,
  buildHttpsUpgradeRule,
  classifyRequest,
  collectLocalFingerprint,
  cookieObservations,
  createSecurityEvent,
  detectPosture,
  exportCookieMetadata,
  exportSecurityCenterConfig,
  getSecurityEvents,
  hasSuspiciousDoubleExtension,
  isCscManagedRuleId,
  isThirdPartyHost,
  isValidLookupName,
  lookupHibpBreaches,
  lookupSafeBrowsing,
  lookupTracker,
  maskAccount,
  parseDohResponse,
  redactSecrets,
  parseSecurityCenterConfig,
  scanUrlLocal,
  strictPosture,
  scoreFindings,
  tabContextFromUrl,
  toCookieMetadata,
  validateBlockHost,
  analyzeFileLocal,
} from '@/core/security-center'
import { assessPasswordStrength, generatePassword } from '@/core/engines/password'
import { DEFAULT_SECURITY_CENTER_SETTINGS } from '@/core/security-center/constants'

import { resetChromeMockStorage } from './setup'

function cookie(
  partial: Partial<{
    name: string
    domain: string
    path: string
    secure: boolean
    httpOnly: boolean
    sameSite: string
    session: boolean
    hostOnly: boolean
    storeId: string
    expirationDate: number
    value: string
  }> & { name: string },
) {
  return {
    domain: '.example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    session: false,
    hostOnly: false,
    storeId: '0',
    value: 'SECRET-VALUE',
    ...partial,
  }
}

function finding(
  partial: Partial<import('@/core/security-center').SecurityFinding> &
    Pick<import('@/core/security-center').SecurityFinding, 'id' | 'result'>,
): import('@/core/security-center').SecurityFinding {
  return {
    name: partial.id,
    category: 'headers',
    severity: 'medium',
    evidence: '',
    timestamp: 1,
    recommendation: '',
    availability: partial.result,
    ...partial,
  }
}

describe('security center scoring', () => {
  it('scores only completed checks and excludes not_available', () => {
    const scored = scoreFindings([
      finding({ id: 'ok', result: 'passed', severity: 'low' }),
      finding({ id: 'warn', result: 'warning', severity: 'medium' }),
      finding({ id: 'bad', result: 'failed', severity: 'high' }),
      finding({ id: 'skip', result: 'not_available', severity: 'critical' }),
      finding({ id: 'later', result: 'not_checked', severity: 'medium' }),
    ])
    expect(scored.completed).toBe(3)
    expect(scored.applicable).toBe(4)
    expect(scored.score).toBeGreaterThan(0)
    expect(scored.score).toBeLessThan(100)
    expect(scored.explanation).toMatch(/not a guarantee/i)
    expect(scored.explanation).toMatch(/excluded/)
  })

  it('returns no score when nothing completed', () => {
    const scored = scoreFindings([finding({ id: 'na', result: 'not_available' })])
    expect(scored.score).toBeNull()
    expect(scored.completed).toBe(0)
  })
})

describe('url heuristics', () => {
  it('flags credentials, shorteners, punycode and IP hosts', () => {
    expect(scanUrlLocal('http://1.2.3.4/login').state).toBe('suspicious')
    expect(scanUrlLocal('https://bit.ly/abc').findings.some((item) => item.id === 'shortener')).toBe(true)
    expect(scanUrlLocal('https://user:pass@example.com/').findings.some((item) => item.id === 'credentials')).toBe(true)
    expect(scanUrlLocal('https://xn--exmple-cua.com/').findings.some((item) => item.id === 'punycode')).toBe(true)
  })

  it('does not call a clean URL guaranteed safe', () => {
    const result = scanUrlLocal('https://example.com/about')
    expect(result.state).toBe('no_known_issue')
    expect(result.recommendations.join(' ')).toMatch(/not a guarantee/i)
  })
})

describe('tracker classification', () => {
  it('labels catalog suffixes, not every third party', () => {
    expect(lookupTracker('doubleclick.net')?.category).toBe('advertising')
    expect(lookupTracker('example.com')).toBeNull()
    expect(TRACKER_CATALOG['gstatic.com']).toBeUndefined()
    expect(isThirdPartyHost('ads.doubleclick.net', 'news.example.com')).toBe(true)
    expect(isThirdPartyHost('www.example.com', 'shop.example.com')).toBe(false)
    expect(
      classifyRequest({
        url: 'https://www.google-analytics.com/g/collect',
        pageUrl: 'https://shop.example.com/',
        blocked: true,
      })?.status,
    ).toBe('blocked')
    expect(
      classifyRequest({
        url: 'https://cdn.example.com/app.js',
        pageUrl: 'https://shop.example.com/',
      }),
    ).toBeNull()
  })
})

describe('cookie metadata', () => {
  it('redacts values and flags weak attributes', () => {
    const meta = toCookieMetadata(
      cookie({
        name: 'sid',
        secure: false,
        httpOnly: false,
        sameSite: 'no_restriction',
        expirationDate: Date.now() / 1000 + 400 * 24 * 60 * 60,
      }),
      'shop.example.com',
    )
    expect(meta).not.toHaveProperty('value')
    expect(meta.observations.length).toBeGreaterThan(0)
    const exported = exportCookieMetadata([meta])
    expect(exported).not.toMatch(/SECRET-VALUE/)
    expect(JSON.parse(exported).note).toMatch(/omitted/i)
    expect(cookieObservations({ name: 'theme', secure: true, httpOnly: true, session: true, sameSite: 'lax' })).toEqual([])
  })
})

describe('header findings', () => {
  it('treats missing optional headers as warnings, not automatic critical vulns', () => {
    const findings = auditHeaders({
      url: 'https://example.com/',
      https: true,
      headers: { 'x-content-type-options': 'nosniff' },
      headersAvailable: true,
      mixedContent: [],
      scripts: [],
      stylesheets: [],
      thirdPartyHosts: [],
      sriMissing: 0,
    })
    const csp = findings.find((item) => item.id === 'csp')
    expect(csp?.result).toBe('warning')
    expect(csp?.severity).not.toBe('critical')
    expect(AUDIT_HEADER_SPECS.length).toBeGreaterThan(3)
    const unavailable = auditHeaders({
      url: 'https://example.com/',
      https: true,
      headers: {},
      headersAvailable: false,
      mixedContent: [],
      scripts: [],
      stylesheets: [],
      thirdPartyHosts: [],
      sriMissing: 0,
    })
    expect(unavailable.filter((item) => item.category === 'headers').every((item) => item.result === 'not_available')).toBe(true)
  })
})

describe('dns parse', () => {
  it('parses DoH JSON and surfaces errors', () => {
    const ok = parseDohResponse(
      { Status: 0, Answer: [{ name: 'example.com.', type: 1, TTL: 60, data: '93.184.216.34' }] },
      'example.com',
      'A',
      'Cloudflare',
    )
    expect(ok.records[0]?.data).toBe('93.184.216.34')
    const fail = parseDohResponse({ Status: 3, Comment: 'NXDOMAIN' }, 'missing.test', 'A', 'Cloudflare')
    expect(fail.error).toMatch(/NXDOMAIN|status/i)
    expect(isValidLookupName('example.com')).toBe(true)
    expect(isValidLookupName('not a domain')).toBe(false)
  })
})

describe('password strength', () => {
  it('scores locally and never writes storage', async () => {
    const weak = assessPasswordStrength('password')
    expect(weak.label).toBe('very_weak')
    expect(weak.reasons.join(' ')).toMatch(/common/i)
    const strong = assessPasswordStrength('correct-Horse-staple-9!xQ')
    expect(strong.score).toBeGreaterThan(weak.score)
    const generated = generatePassword({ length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: true })
    expect(generated.ok).toBe(true)
    if (generated.ok) expect(generated.value).toHaveLength(24)
    const setMock = chrome.storage.local.set as unknown as ReturnType<typeof vi.fn>
    setMock.mockClear()
    assessPasswordStrength('hunter2')
    generatePassword({ length: 12, uppercase: true, lowercase: true, numbers: true, symbols: false, excludeAmbiguous: false })
    expect(setMock).not.toHaveBeenCalled()
  })
})

describe('file analysis', () => {
  it('detects double extensions, mismatches and hashes locally', () => {
    expect(hasSuspiciousDoubleExtension('invoice.pdf.exe')).toBe(true)
    expect(hasSuspiciousDoubleExtension('archive.tar.gz')).toBe(false)
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1])
    const report = analyzeFileLocal({
      name: 'photo.jpg',
      mime: 'image/jpeg',
      size: png.byteLength,
      head: png,
      sha256: 'abc',
    })
    expect(report.extensionMismatch).toBe(true)
    expect(report.disclaimer).toMatch(/not antivirus/i)
    expect(report.sha256).toBe('abc')
  })
})

describe('events and settings', () => {
  beforeEach(() => resetChromeMockStorage())

  it('retains a bounded event log', async () => {
    for (let index = 0; index < 60; index += 1) {
      await appendSecurityEvent(
        {
          type: 'security_audit_completed',
          category: 'audit',
          severity: 'info',
          description: `event ${index}`,
          source: 'test',
        },
        50,
      )
    }
    const events = await getSecurityEvents()
    expect(events).toHaveLength(50)
    expect(createSecurityEvent({ type: 'cookie_deleted', category: 'cookies', severity: 'info', description: 'x'.repeat(800), source: 't' }).description.length).toBeLessThanOrEqual(400)
    expect(redactSecrets('Contact jane@example.com token=abc123')).toMatch(/\[redacted-email\]/)
    expect(redactSecrets('Contact jane@example.com token=abc123')).not.toMatch(/abc123/)
    expect(createSecurityEvent({ type: 'security_audit_completed', category: 'audit', severity: 'info', description: 'Looked up jane@example.com', source: 'hibp', evidence: 'apiKey=supersecret' }).evidence).not.toMatch(/supersecret/)
  })

  it('round-trips config without provider secrets', () => {
    const json = exportSecurityCenterConfig({ ...DEFAULT_SECURITY_CENTER_SETTINGS, httpsUpgrade: true })
    expect(json).not.toMatch(/apiKey/i)
    const parsed = parseSecurityCenterConfig(json)
    expect(parsed.httpsUpgrade).toBe(true)
    expect(() => parseSecurityCenterConfig('{"version":2}')).toThrow(/not a Cyber Security Center/)
  })
})

describe('DNR ranges', () => {
  it('keeps CSC rules out of adblock, protection and interceptor ranges', () => {
    expect(HTTPS_UPGRADE_RULE_ID).toBeGreaterThanOrEqual(4_100_000)
    expect(isCscManagedRuleId(HTTPS_UPGRADE_RULE_ID)).toBe(true)
    expect(isCscManagedRuleId(CSC_BLOCKLIST_RULE_ID_BASE)).toBe(true)
    expect(isCscManagedRuleId(CSC_BLOCKLIST_RULE_ID_MAX)).toBe(true)
    expect(isProtectionManagedRuleId(HTTPS_UPGRADE_RULE_ID)).toBe(false)
    expect(isSupplementalRuleId(1_100_000)).toBe(true)
    expect(isSupplementalRuleId(1_999_999)).toBe(true)
    expect(isSupplementalRuleId(2_000_000)).toBe(false)
    expect(isSupplementalRuleId(HTTPS_UPGRADE_RULE_ID)).toBe(false)
    expect(isInterceptorRuleId(HTTPS_UPGRADE_RULE_ID, INTERCEPTOR_RULE_ID_BASE, INTERCEPTOR_RULE_ID_MAX)).toBe(false)
    expect(validateBlockHost('ADS.Example.com')).toBe('ads.example.com')
    expect(validateBlockHost('not a host')).toBeNull()
    const { rules, errors } = buildBlocklistRules(['ads.example.com', 'ads.example.com', 'nope'])
    expect(rules[0]?.id).toBeGreaterThanOrEqual(CSC_BLOCKLIST_RULE_ID_BASE)
    expect(rules[0]?.id).toBeLessThanOrEqual(CSC_BLOCKLIST_RULE_ID_MAX)
    expect(errors.length).toBeGreaterThan(0)
    expect(buildHttpsUpgradeRule().action.type).toBe('upgradeScheme')
  })
})

describe('providers', () => {
  it('stays not-configured without a key or consent', async () => {
    expect(breachNotConfigured().state).toBe('not_configured')
    expect(maskAccount('jane@example.com')).toBe('j•••@example.com')
    const noConsent = await lookupHibpBreaches({ email: 'a@b.co', apiKey: 'key', consent: false })
    expect(noConsent.state).toBe('not_configured')
    const noKey = await lookupHibpBreaches({ email: 'a@b.co', apiKey: '', consent: true })
    expect(noKey.state).toBe('not_configured')
    const sb = await lookupSafeBrowsing({ url: 'https://example.com', apiKey: '', consent: true })
    expect(sb.state).toBe('not_checked')
  })
})

describe('fingerprint inspector', () => {
  it('classifies local signals without a uniqueness score', () => {
    const signals = collectLocalFingerprint({
      userAgent: 'Mozilla/5.0',
      platform: 'Win32',
      languages: ['en-US'],
      timeZone: 'UTC',
      screenWidth: 1920,
      screenHeight: 1080,
    })
    expect(signals.some((item) => item.classification === 'potentially_identifying')).toBe(true)
    expect(signals.find((item) => item.id === 'canvas')?.classification).toBe('unavailable')
    expect(signals.every((item) => !/unique|uniqueness score/i.test(item.value))).toBe(true)
    expect(signals.some((item) => /not a uniqueness score/i.test(item.explanation))).toBe(true)
  })
})

describe('protection posture', () => {
  it('treats mixed toggles as custom', () => {
    const balanced = balancedPosture()
    const strict = strictPosture()
    expect(strict.httpsUpgrade).toBe(true)
    expect(balanced.httpsUpgrade).toBe(false)
    expect(
      detectPosture(
        { ...balanced.protection, phishing: false } as never,
        { ...balanced.adblock } as never,
        { httpsUpgrade: false },
      ),
    ).toBe('custom')
  })
})

describe('tab context', () => {
  it('marks browser surfaces restricted', () => {
    expect(tabContextFromUrl('chrome://settings').restricted).toBe(true)
    expect(tabContextFromUrl('https://www.Example.com/path').https).toBe(true)
    expect(tabContextFromUrl('https://www.Example.com/path').hostname).toBe('example.com')
  })
})
