import {
  DOMAINS_PER_RULE,
  PROCEED_SESSION_RULE_ID_BASE,
  THREAT_RULE_ID_BASE,
  THREAT_RULE_PRIORITY,
  TRUSTED_RULE_ID_BASE,
  TRUSTED_RULE_PRIORITY,
} from './constants'
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

function isIpv4(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function categoryEnabled(state: ProtectionState, category: ThreatListCategory): boolean {
  if (!state.enabled) return false
  if (category === 'phishing') return state.phishing
  if (category === 'malware') return state.malware
  return state.scams
}

function hostsForCategory(threats: ThreatsFile, category: ThreatListCategory): string[] {
  return threats[category]
}

export function buildThreatRules(
  threats: ThreatsFile,
  state: ProtectionState,
  extensionBase: string,
): chrome.declarativeNetRequest.Rule[] {
  if (!state.enabled) return []

  const rules: chrome.declarativeNetRequest.Rule[] = []
  let id = THREAT_RULE_ID_BASE

  const categories: ThreatListCategory[] = ['phishing', 'malware', 'scam']
  for (const category of categories) {
    if (!categoryEnabled(state, category)) continue
    const hosts = hostsForCategory(threats, category)
    const domains: string[] = []
    const ips: string[] = []
    for (const h of hosts) {
      if (isIpv4(h)) ips.push(h)
      else domains.push(h)
    }

    for (const domainChunk of chunkArray(domains, DOMAINS_PER_RULE)) {
      const redirectUrl = `${extensionBase}/blocked.html?c=${category}`
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

    for (const ip of ips) {
      const redirectUrl = `${extensionBase}/blocked.html?c=${category}`
      rules.push({
        id: id++,
        priority: THREAT_RULE_PRIORITY,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: `${redirectUrl}#\\0` },
        },
        condition: {
          urlFilter: `||${ip}^`,
          resourceTypes: ['main_frame'],
        },
      })
      rules.push({
        id: id++,
        priority: THREAT_RULE_PRIORITY,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${ip}^`,
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
        resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest', 'image', 'other'],
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
