import {
  buildThreatRules,
  buildTrustedAllowRules,
  isProtectionManagedRuleId,
  PROTECTION_FILES,
  type ProtectionState,
  type ThreatsFile,
} from '@/core/protection'
import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { createLogger } from '@/core/logging'

const logger = createLogger('protection-rules')

let cachedThreats: ThreatsFile | null = null

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

function stateFingerprint(state: ProtectionState): string {
  return JSON.stringify({
    enabled: state.enabled,
    phishing: state.phishing,
    malware: state.malware,
    scams: state.scams,
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
  const sessionRules = await chrome.declarativeNetRequest.getSessionRules()
  const removeRuleIds = [
    ...existing.filter((rule) => isProtectionManagedRuleId(rule.id)).map((rule) => rule.id),
    ...sessionRules.filter((rule) => isProtectionManagedRuleId(rule.id)).map((rule) => rule.id),
  ]

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
}
