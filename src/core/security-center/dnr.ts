import { normalizeHostname } from '@/core/adblock/hostname'

import {
  CSC_BLOCKLIST_PRIORITY,
  CSC_BLOCKLIST_RULE_ID_BASE,
  CSC_BLOCKLIST_RULE_ID_MAX,
  HTTPS_UPGRADE_RULE_ID,
} from './constants'

const RESOURCE_TYPES = [
  'main_frame',
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

export function isCscManagedRuleId(id: number): boolean {
  return id === HTTPS_UPGRADE_RULE_ID || (id >= CSC_BLOCKLIST_RULE_ID_BASE && id <= CSC_BLOCKLIST_RULE_ID_MAX)
}

export function buildHttpsUpgradeRule(): chrome.declarativeNetRequest.Rule {
  return {
    id: HTTPS_UPGRADE_RULE_ID,
    priority: 1,
    action: { type: 'upgradeScheme' },
    condition: {
      urlFilter: '|http://*',
      resourceTypes: RESOURCE_TYPES,
    },
  }
}

export function validateBlockHost(raw: string): string | null {
  return normalizeHostname(raw)
}

export function buildBlocklistRules(hosts: string[]): {
  rules: chrome.declarativeNetRequest.Rule[]
  errors: string[]
} {
  const seen = new Set<string>()
  const errors: string[] = []
  const rules: chrome.declarativeNetRequest.Rule[] = []
  const max = CSC_BLOCKLIST_RULE_ID_MAX - CSC_BLOCKLIST_RULE_ID_BASE
  for (const raw of hosts) {
    const host = validateBlockHost(raw)
    if (!host) {
      errors.push(`Ignored invalid host: ${raw}`)
      continue
    }
    if (seen.has(host)) {
      errors.push(`Duplicate host: ${host}`)
      continue
    }
    if (rules.length >= max) {
      errors.push('Blocklist exceeds the browser dynamic rule budget reserved for this tool.')
      break
    }
    seen.add(host)
    rules.push({
      id: CSC_BLOCKLIST_RULE_ID_BASE + rules.length,
      priority: CSC_BLOCKLIST_PRIORITY,
      action: { type: 'block' },
      condition: {
        requestDomains: [host],
        resourceTypes: RESOURCE_TYPES,
      },
    })
  }
  return { rules, errors }
}

export async function syncCscDynamicRules(options: {
  httpsUpgrade: boolean
  blocklist: string[]
}): Promise<{ errors: string[] }> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing.filter((rule) => isCscManagedRuleId(rule.id)).map((rule) => rule.id)
  const addRules: chrome.declarativeNetRequest.Rule[] = []
  if (options.httpsUpgrade) addRules.push(buildHttpsUpgradeRule())
  const { rules, errors } = buildBlocklistRules(options.blocklist)
  addRules.push(...rules)
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules })
    return { errors }
  } catch (error) {
    if (removeRuleIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds }).catch(() => undefined)
    }
    return {
      errors: [
        ...errors,
        error instanceof Error ? error.message : 'Failed to install Cyber Security Center network rules.',
      ],
    }
  }
}
