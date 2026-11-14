import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import { DEFAULT_SECURITY_CENTER_SETTINGS } from './constants'
import type { SecurityCenterSettings, SecurityProviderSecrets } from './types'

export function mergeSecurityCenterSettings(
  stored: Partial<SecurityCenterSettings> | undefined,
): SecurityCenterSettings {
  const base = DEFAULT_SECURITY_CENTER_SETTINGS
  return {
    ...base,
    ...stored,
    version: 1,
    blocklist: Array.isArray(stored?.blocklist) ? stored.blocklist.filter(Boolean) : base.blocklist,
    allowlist: Array.isArray(stored?.allowlist) ? stored.allowlist.filter(Boolean) : base.allowlist,
    dnsProviderUrl: stored?.dnsProviderUrl?.trim() || base.dnsProviderUrl,
    dnsProviderName: stored?.dnsProviderName?.trim() || base.dnsProviderName,
    eventRetention: clampInt(stored?.eventRetention, 50, 2000, base.eventRetention),
    networkLogSize: clampInt(stored?.networkLogSize, 50, 2000, base.networkLogSize),
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export async function getSecurityCenterSettings(): Promise<SecurityCenterSettings> {
  const stored = await get<Partial<SecurityCenterSettings>>(STORAGE_KEYS.securityCenterSettings)
  return mergeSecurityCenterSettings(stored)
}

export async function updateSecurityCenterSettings(
  patch: Partial<SecurityCenterSettings>,
): Promise<SecurityCenterSettings> {
  const current = await getSecurityCenterSettings()
  const next = mergeSecurityCenterSettings({ ...current, ...patch })
  await set(STORAGE_KEYS.securityCenterSettings, next)
  return next
}

export async function getProviderSecrets(): Promise<SecurityProviderSecrets> {
  const stored = await get<Partial<SecurityProviderSecrets>>(STORAGE_KEYS.securityCenterProviders)
  return {
    version: 1,
    breachApiKey: stored?.breachApiKey,
    urlReputationApiKey: stored?.urlReputationApiKey,
    ipReputationApiKey: stored?.ipReputationApiKey,
    fileReputationApiKey: stored?.fileReputationApiKey,
    safeBrowsingApiKey: stored?.safeBrowsingApiKey,
  }
}

export async function updateProviderSecrets(
  patch: Partial<SecurityProviderSecrets>,
): Promise<SecurityProviderSecrets> {
  const current = await getProviderSecrets()
  const next: SecurityProviderSecrets = { ...current, ...patch, version: 1 }
  await set(STORAGE_KEYS.securityCenterProviders, next)
  return next
}

export interface SecurityCenterExport {
  version: 1
  exportedAt: number
  settings: SecurityCenterSettings
}

export function exportSecurityCenterConfig(settings: SecurityCenterSettings): string {
  const payload: SecurityCenterExport = {
    version: 1,
    exportedAt: Date.now(),
    settings: {
      ...settings,
    },
  }
  return JSON.stringify(payload, null, 2)
}

export function parseSecurityCenterConfig(raw: string): SecurityCenterSettings {
  const parsed = JSON.parse(raw) as Partial<SecurityCenterExport>
  if (!parsed || parsed.version !== 1 || !parsed.settings) {
    throw new Error('This file is not a Cyber Security Center configuration.')
  }
  return mergeSecurityCenterSettings(parsed.settings)
}
