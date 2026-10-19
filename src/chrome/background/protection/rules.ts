import {
  buildThreatRules,
  buildTrustedAllowRules,
  isProtectionManagedRuleId,
  isSafeToBlock,
  PROTECTION_FILES,
  THREAT_LIST_CATEGORIES,
  type ProtectionState,
  type ThreatListCategory,
  type ThreatsFile,
} from '@/core/protection'
import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-rules')

/** Bump when the rule shape changes so installed rules are rebuilt on update. */
const RULE_SCHEMA_VERSION = 3

let cachedThreats: ThreatsFile | null = null
let hostIndex: Map<string, ThreatListCategory> | null = null

export async function loadThreatsFile(): Promise<ThreatsFile | null> {
  if (cachedThreats) return cachedThreats
  try {
    const url = chrome.runtime.getURL(PROTECTION_FILES.threatsJson)
    const res = await fetch(url)
    if (!res.ok) return null
    cachedThreats = (await res.json()) as ThreatsFile
    return cachedThreats
  } catch (error) {
    logger.warn('load threats.json failed', error)
    return null
  }
}

/** Category of a host (or any of its parent domains) on the bundled threat lists. */
export async function threatCategoryForHost(host: string): Promise<ThreatListCategory | null> {
  if (!host || !isSafeToBlock(host)) return null
  if (!hostIndex) {
    const threats = await loadThreatsFile()
    if (!threats) return null
    hostIndex = new Map()
    for (const category of THREAT_LIST_CATEGORIES) {
      for (const h of threats[category] ?? []) if (isSafeToBlock(h)) hostIndex.set(h, category)
    }
  }
  const parts = host.toLowerCase().split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    const hit = hostIndex.get(parts.slice(i).join('.'))
    if (hit) return hit
  }
  return hostIndex.get(host.toLowerCase()) ?? null
}

function stateFingerprint(state: ProtectionState): string {
  return JSON.stringify({
    schema: RULE_SCHEMA_VERSION,
    enabled: state.enabled,
    phishing: state.phishing,
    malware: state.malware,
    scams: state.scams,
    miners: state.miners,
    trusted: [...state.trusted].sort(),
  })
}

export async function syncProtectionRules(state: ProtectionState): Promise<void> {
  const threats = await loadThreatsFile()
  if (!threats) {
    logger.warn('no threats file; skipping rule sync')
    return
  }

  const version = `${threats.generated}|${stateFingerprint(state)}`
  const stored = await get<string>(STORAGE_KEYS.protectionRulesVersion)
  if (stored === version) return

  const extensionBase = chrome.runtime.getURL('').replace(/\/$/, '')
  const threatRules = buildThreatRules(threats, state, extensionBase)
  const trustedRules = state.enabled ? buildTrustedAllowRules(state.trusted) : []
  const addRules = [...threatRules, ...trustedRules]

  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing
    .filter((rule) => isProtectionManagedRuleId(rule.id))
    .map((rule) => rule.id)

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules })
    await set(STORAGE_KEYS.protectionRulesVersion, version)
    logger.debug('synced protection rules', { count: addRules.length })
  } catch (error) {
    logger.warn('updateDynamicRules failed', error)
  }
}

export function invalidateThreatsCache(): void {
  cachedThreats = null
  hostIndex = null
}
