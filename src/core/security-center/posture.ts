import type { AdblockState } from '@/core/adblock'
import { DEFAULT_ADBLOCK_STATE } from '@/core/adblock'
import type { ProtectionState } from '@/core/protection'
import { DEFAULT_PROTECTION_STATE } from '@/core/protection'

import type { ProtectionPosture, SecurityCenterSettings } from './types'

export interface PosturePatch {
  protection: Partial<ProtectionState>
  adblock: Partial<AdblockState>
  httpsUpgrade: boolean
}

export function balancedPosture(): PosturePatch {
  return {
    protection: {
      enabled: true,
      phishing: true,
      malware: true,
      scams: true,
      miners: true,
      lookalike: true,
      scamGuard: true,
      clipboardGuard: true,
      notificationGuard: true,
      downloadGuard: true,
      openedTabGuard: true,
      redirectProtection: { ...DEFAULT_PROTECTION_STATE.redirectProtection, enabled: true },
    },
    adblock: {
      enabled: true,
      lists: { ...DEFAULT_ADBLOCK_STATE.lists, ads: true, privacy: true, annoyances: false, youtube: true },
      blockPopups: true,
      cookieBanners: false,
    },
    httpsUpgrade: false,
  }
}

export function strictPosture(): PosturePatch {
  return {
    protection: {
      enabled: true,
      phishing: true,
      malware: true,
      scams: true,
      miners: true,
      lookalike: true,
      scamGuard: true,
      clipboardGuard: true,
      notificationGuard: true,
      downloadGuard: true,
      openedTabGuard: true,
      redirectProtection: { ...DEFAULT_PROTECTION_STATE.redirectProtection, enabled: true },
    },
    adblock: {
      enabled: true,
      lists: { ads: true, privacy: true, annoyances: true, youtube: true },
      blockPopups: true,
      cookieBanners: true,
      cosmeticEnabled: true,
      distractions: true,
    },
    httpsUpgrade: true,
  }
}

function flag(value: boolean | undefined): boolean {
  return Boolean(value)
}

export function detectPosture(
  protection: ProtectionState,
  adblock: AdblockState,
  settings: Pick<SecurityCenterSettings, 'httpsUpgrade'>,
): ProtectionPosture {
  const balanced = balancedPosture()
  const strict = strictPosture()
  if (matchesPatch(protection, adblock, settings.httpsUpgrade, strict)) return 'strict'
  if (matchesPatch(protection, adblock, settings.httpsUpgrade, balanced)) return 'balanced'
  return 'custom'
}

function matchesPatch(
  protection: ProtectionState,
  adblock: AdblockState,
  httpsUpgrade: boolean,
  patch: PosturePatch,
): boolean {
  if (httpsUpgrade !== patch.httpsUpgrade) return false
  if (flag(protection.enabled) !== flag(patch.protection.enabled)) return false
  for (const key of [
    'phishing',
    'malware',
    'scams',
    'miners',
    'lookalike',
    'scamGuard',
    'clipboardGuard',
    'notificationGuard',
    'downloadGuard',
    'openedTabGuard',
  ] as const) {
    if (patch.protection[key] != null && protection[key] !== patch.protection[key]) return false
  }
  if (flag(adblock.enabled) !== flag(patch.adblock.enabled)) return false
  if (patch.adblock.blockPopups != null && adblock.blockPopups !== patch.adblock.blockPopups) return false
  if (patch.adblock.lists) {
    for (const id of ['ads', 'privacy', 'annoyances'] as const) {
      if (patch.adblock.lists[id] != null && adblock.lists[id] !== patch.adblock.lists[id]) return false
    }
  }
  return true
}

export function countActiveModules(protection: ProtectionState, adblock: AdblockState, httpsUpgrade: boolean): {
  active: number
  total: number
} {
  const flags = [
    protection.enabled && protection.malware,
    protection.enabled && protection.phishing,
    protection.enabled && protection.redirectProtection.enabled,
    protection.enabled && protection.downloadGuard,
    protection.enabled && protection.miners,
    protection.enabled && protection.lookalike,
    adblock.enabled && adblock.blockPopups,
    adblock.enabled && adblock.lists.ads,
    adblock.enabled && adblock.lists.privacy,
    httpsUpgrade,
    protection.enabled && protection.clipboardGuard,
    protection.enabled && protection.scamGuard,
  ]
  return { active: flags.filter(Boolean).length, total: flags.length }
}
