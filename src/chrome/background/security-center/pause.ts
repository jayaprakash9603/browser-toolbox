import { getAdblockState, updateAdblockState } from '@/core/adblock'
import {
  PAUSE_ALARM_NAME,
  PAUSE_DURATION_MS,
  PAUSE_SESSION_KEY,
  appendSecurityEvent,
  type PauseSnapshot,
} from '@/core/security-center'
import { getProtectionState, updateProtectionState } from '@/core/protection'

export async function getPauseSnapshot(): Promise<PauseSnapshot | null> {
  const stored = await chrome.storage.session.get(PAUSE_SESSION_KEY)
  const value = stored[PAUSE_SESSION_KEY] as PauseSnapshot | undefined
  if (!value?.until) return null
  if (value.until <= Date.now()) {
    await chrome.storage.session.remove(PAUSE_SESSION_KEY)
    return null
  }
  return value
}

export async function pauseProtection(ms = PAUSE_DURATION_MS): Promise<PauseSnapshot> {
  const [protection, adblock] = await Promise.all([getProtectionState(), getAdblockState()])
  const snapshot: PauseSnapshot = {
    until: Date.now() + ms,
    protectionEnabled: protection.enabled,
    adblockEnabled: adblock.enabled,
  }
  await chrome.storage.session.set({ [PAUSE_SESSION_KEY]: snapshot })
  await Promise.all([
    protection.enabled ? updateProtectionState({ enabled: false }) : Promise.resolve(),
    adblock.enabled ? updateAdblockState({ enabled: false }) : Promise.resolve(),
  ])
  await chrome.alarms.create(PAUSE_ALARM_NAME, { when: snapshot.until })
  await appendSecurityEvent({
    type: 'protection_paused',
    category: 'settings',
    severity: 'medium',
    description: 'Protection engines paused for 5 minutes.',
    action: 'pause',
    source: 'security-center',
  })
  return snapshot
}

export async function resumeProtection(): Promise<PauseSnapshot | null> {
  const snapshot = await getPauseSnapshot()
  await chrome.alarms.clear(PAUSE_ALARM_NAME)
  await chrome.storage.session.remove(PAUSE_SESSION_KEY)
  if (!snapshot) return null
  await Promise.all([
    snapshot.protectionEnabled ? updateProtectionState({ enabled: true }) : Promise.resolve(),
    snapshot.adblockEnabled ? updateAdblockState({ enabled: true }) : Promise.resolve(),
  ])
  await appendSecurityEvent({
    type: 'protection_resumed',
    category: 'settings',
    severity: 'info',
    description: 'Protection engines resumed.',
    action: 'resume',
    source: 'security-center',
  })
  return snapshot
}

export function registerPauseAlarm(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== PAUSE_ALARM_NAME) return
    void resumeProtection()
  })
}
