import { getAdblockState, updateAdblockState } from '@/core/adblock'
import { getProtectionState, updateProtectionState } from '@/core/protection'
import {
  detectPosture,
  getSecurityCenterSettings,
  strictPosture,
  balancedPosture,
  updateSecurityCenterSettings,
  type ProtectionPosture,
  type SecurityCenterSettings,
} from '@/core/security-center'
import type { AdblockState } from '@/core/adblock'
import type { ProtectionState } from '@/core/protection'

export async function applySecurityPosture(id: Exclude<ProtectionPosture, 'custom'>): Promise<{
  protection: ProtectionState
  adblock: AdblockState
  settings: SecurityCenterSettings
}> {
  const patch = id === 'strict' ? strictPosture() : balancedPosture()
  const [protection, adblock] = await Promise.all([
    updateProtectionState(patch.protection),
    updateAdblockState(patch.adblock),
  ])
  const settings = await updateSecurityCenterSettings({ posture: id, httpsUpgrade: patch.httpsUpgrade })
  return { protection, adblock, settings }
}

export async function syncDetectedPosture(): Promise<ProtectionPosture> {
  const [protection, adblock, settings] = await Promise.all([
    getProtectionState(),
    getAdblockState(),
    getSecurityCenterSettings(),
  ])
  const posture = detectPosture(protection, adblock, settings)
  if (posture !== settings.posture) await updateSecurityCenterSettings({ posture })
  return posture
}
