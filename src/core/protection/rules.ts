import {
  DOMAINS_PER_RULE,
  PROCEED_SESSION_RULE_ID_BASE,
  SAFE_DOMAINS,
  THREAT_RULE_ID_BASE,
  THREAT_RULE_PRIORITY,
  TRUSTED_RULE_ID_BASE,
  TRUSTED_RULE_PRIORITY,
} from './constants'
import { THREAT_LIST_CATEGORIES } from './types'
import type { ProtectionState, ThreatListCategory, ThreatsFile } from './types'

const SUB_RESOURCE_TYPES = [
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other',
] as chrome.declarativeNetRequest.ResourceType[]

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function categoryEnabled(state: ProtectionState, category: ThreatListCategory): boolean {
  if (!state.enabled) return false
  if (category === 'phishing') return state.phishing
  if (category === 'malware') return state.malware
  if (category === 'miner') return state.miners
  return state.scams
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const GOOGLE_HOST = /(^|\.)google\.(com?\.)?[a-z]{2,3}$/
const PUBLIC_SUFFIX = /^(co|com|net|org|gov|edu|ac|ne|or|go|gob|mil)\.[a-z]{2}$/

/**
 * `requestDomains` also matches subdomains, so one bad entry ("com", "co.uk", "google.com")
 * would block huge parts of the web. Such entries are dropped even if a list ships them.
 */
export function isSafeToBlock(host: string): boolean {
  if (IPV4.test(host)) return true
  const labels = host.split('.')
  if (labels.length < 2 || labels.some((l) => !l)) return false
  if (PUBLIC_SUFFIX.test(host)) return false
  if (GOOGLE_HOST.test(host)) return false
  return !SAFE_DOMAINS.some((safe) => host === safe || host.endsWith(`.${safe}`))
}

function hostsForCategory(threats: ThreatsFile, category: ThreatListCategory): string[] {
  return (threats[category] ?? []).filter(isSafeToBlock)
}

/**
 * IPv4 hosts go into `requestDomains` like names do. One redirect rule per IP would blow
 * through Chrome's 5,000 unsafe dynamic rule limit (URLhaus alone lists ~15k IPs).
 */
export function buildThreatRules(
  threats: ThreatsFile,
  state: ProtectionState,
  extensionBase: string,
): chrome.declarativeNetRequest.Rule[] {
  if (!state.enabled) return []

  const rules: chrome.declarativeNetRequest.Rule[] = []
  let id = THREAT_RULE_ID_BASE

  for (const category of THREAT_LIST_CATEGORIES) {
    if (!categoryEnabled(state, category)) continue
    const redirectUrl = `${extensionBase}/blocked.html?c=${category}`
    for (const domainChunk of chunkArray(hostsForCategory(threats, category), DOMAINS_PER_RULE)) {
      rules.push({
        id: id++,
        priority: THREAT_RULE_PRIORITY,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: `${redirectUrl}#\\0` },
        },
        condition: {
          requestDomains: domainChunk,
          regexFilter: '^.+$',
          resourceTypes: ['main_frame'],
        },
      })
      rules.push({
        id: id++,
        priority: THREAT_RULE_PRIORITY,
        action: { type: 'block' },
        condition: {
          requestDomains: domainChunk,
          resourceTypes: [...SUB_RESOURCE_TYPES],
        },
      })
    }
  }

  return rules
}

export function buildTrustedAllowRules(trustedHosts: string[]): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = []
  const seen = new Set<string>()
  let index = 0
  for (const raw of trustedHosts) {
    const host = raw.replace(/^www\./, '').toLowerCase()
    if (!host || seen.has(host)) continue
    seen.add(host)
    rules.push({
      id: TRUSTED_RULE_ID_BASE + index,
      priority: TRUSTED_RULE_PRIORITY,
      action: { type: 'allowAllRequests' },
      condition: {
        requestDomains: [host],
        // allowAllRequests only accepts frame types; it then allows everything the frame loads
        resourceTypes: ['main_frame', 'sub_frame'],
      },
    })
    index += 1
  }
  return rules
}

const PROTECTION_RULE_ID_CEILING = 3_000_000

export function isProtectionManagedRuleId(id: number): boolean {
  return id >= THREAT_RULE_ID_BASE && id < PROTECTION_RULE_ID_CEILING
}

export function proceedOnceRuleId(host: string): number {
  let hash = 0
  for (let i = 0; i < host.length; i++) hash = (hash * 31 + host.charCodeAt(i)) >>> 0
  return PROCEED_SESSION_RULE_ID_BASE + (hash % 49_000)
}

export function buildProceedOnceRule(host: string): chrome.declarativeNetRequest.Rule {
  return {
    id: proceedOnceRuleId(host),
    priority: TRUSTED_RULE_PRIORITY,
    action: { type: 'allowAllRequests' },
    condition: {
      requestDomains: [host],
      resourceTypes: ['main_frame'],
    },
  }
}
