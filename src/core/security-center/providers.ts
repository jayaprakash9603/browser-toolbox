import type { BreachLookupResult, URLScanResult } from './types'

export function breachNotConfigured(): BreachLookupResult {
  return { state: 'not_configured', provider: 'Have I Been Pwned', breaches: [] }
}

export function maskAccount(email: string): string {
  const trimmed = email.trim()
  const at = trimmed.indexOf('@')
  if (at < 1) return '•••'
  return `${trimmed[0]}•••${trimmed.slice(at)}`
}

export async function lookupHibpBreaches(options: {
  email: string
  apiKey: string
  consent: boolean
  fetchImpl?: typeof fetch
}): Promise<BreachLookupResult> {
  if (!options.consent) {
    return { state: 'not_configured', provider: 'Have I Been Pwned', breaches: [], error: 'Consent is required before lookup.' }
  }
  if (!options.apiKey.trim()) return breachNotConfigured()
  const email = options.email.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      state: 'unavailable',
      provider: 'Have I Been Pwned',
      breaches: [],
      error: 'Enter a valid email address.',
    }
  }
  try {
    const fetchImpl = options.fetchImpl ?? fetch
    const response = await fetchImpl(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          'hibp-api-key': options.apiKey.trim(),
          'user-agent': 'OnePanel-CyberSecurityCenter',
        },
      },
    )
    if (response.status === 404) {
      return {
        state: 'no_results',
        provider: 'Have I Been Pwned',
        lookedUpAt: Date.now(),
        accountHint: maskAccount(email),
        breaches: [],
      }
    }
    if (response.status === 401) {
      return { state: 'unavailable', provider: 'Have I Been Pwned', breaches: [], error: 'The API key was rejected.' }
    }
    if (response.status === 429) {
      return { state: 'rate_limited', provider: 'Have I Been Pwned', breaches: [], error: 'The provider rate-limited this request.' }
    }
    if (!response.ok) {
      return { state: 'unavailable', provider: 'Have I Been Pwned', breaches: [], error: `HTTP ${response.status}` }
    }
    const payload = (await response.json()) as Array<{
      Name?: string
      Domain?: string
      BreachDate?: string
      DataClasses?: string[]
      Description?: string
    }>
    if (!Array.isArray(payload)) {
      return { state: 'unavailable', provider: 'Have I Been Pwned', breaches: [], error: 'Unexpected provider response.' }
    }
    return {
      state: payload.length ? 'results' : 'no_results',
      provider: 'Have I Been Pwned',
      lookedUpAt: Date.now(),
      accountHint: maskAccount(email),
      breaches: payload.map((item) => ({
        name: String(item.Name ?? 'Unknown breach'),
        domain: item.Domain,
        breachDate: item.BreachDate,
        dataClasses: Array.isArray(item.DataClasses) ? item.DataClasses.map(String) : [],
        description: item.Description ? stripTags(item.Description).slice(0, 280) : undefined,
      })),
    }
  } catch {
    return { state: 'unavailable', provider: 'Have I Been Pwned', breaches: [], error: 'The breach provider could not be reached.' }
  }
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '')
}

export async function lookupSafeBrowsing(options: {
  url: string
  apiKey: string
  consent: boolean
  fetchImpl?: typeof fetch
}): Promise<Pick<URLScanResult, 'state' | 'provider' | 'lookedUpAt'> & { evidence?: string }> {
  if (!options.consent || !options.apiKey.trim()) {
    return { state: 'not_checked', provider: 'Google Safe Browsing' }
  }
  try {
    const fetchImpl = options.fetchImpl ?? fetch
    const response = await fetchImpl(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(options.apiKey.trim())}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: 'one-panel', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: options.url }],
          },
        }),
      },
    )
    if (response.status === 429) return { state: 'provider_unavailable', provider: 'Google Safe Browsing' }
    if (!response.ok) return { state: 'provider_unavailable', provider: 'Google Safe Browsing' }
    const payload = (await response.json()) as { matches?: unknown[] }
    const malicious = Array.isArray(payload.matches) && payload.matches.length > 0
    return {
      state: malicious ? 'known_malicious' : 'no_known_issue',
      provider: 'Google Safe Browsing',
      lookedUpAt: Date.now(),
      evidence: malicious ? 'Provider reported a threat match.' : 'Provider returned no matches.',
    }
  } catch {
    return { state: 'provider_unavailable', provider: 'Google Safe Browsing' }
  }
}
