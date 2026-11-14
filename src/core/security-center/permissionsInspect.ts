import type { SitePermissionState, SitePermissionStatus } from './types'

export const SITE_PERMISSIONS: Array<{ permission: string; name: string; settingsHash: string }> = [
  { permission: 'camera', name: 'Camera', settingsHash: 'camera' },
  { permission: 'microphone', name: 'Microphone', settingsHash: 'microphone' },
  { permission: 'geolocation', name: 'Location', settingsHash: 'location' },
  { permission: 'notifications', name: 'Notifications', settingsHash: 'notifications' },
  { permission: 'clipboard-read', name: 'Clipboard', settingsHash: 'clipboard' },
  { permission: 'clipboard-write', name: 'Clipboard write', settingsHash: 'clipboard' },
  { permission: 'midi', name: 'MIDI', settingsHash: 'midiSysex' },
  { permission: 'persistent-storage', name: 'Persistent storage', settingsHash: 'siteDetails' },
  { permission: 'push', name: 'Push', settingsHash: 'notifications' },
  { permission: 'idle-detection', name: 'Idle detection', settingsHash: 'siteDetails' },
  { permission: 'window-management', name: 'Window management', settingsHash: 'siteDetails' },
]

export function permissionStateFrom(value: string | null | undefined): SitePermissionState {
  if (value === 'granted' || value === 'denied' || value === 'prompt') return value
  return 'not_supported'
}

export function describePermission(name: string, state: SitePermissionState): SitePermissionStatus {
  const spec = SITE_PERMISSIONS.find((item) => item.permission === name || item.name === name)
  const label = spec?.name ?? name
  const how =
    state === 'not_supported'
      ? 'This permission is not exposed to extensions in this browser.'
      : 'The extension cannot always change site permissions. Open Chrome/Edge site settings to allow or block this feature.'
  return { name: label, permission: spec?.permission ?? name, state, howToManage: how }
}

export function siteSettingsUrl(pageUrl: string | undefined): string | null {
  if (!pageUrl) return null
  try {
    const parsed = new URL(pageUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return `chrome://settings/content/siteDetails?site=${encodeURIComponent(parsed.origin)}`
  } catch {
    return null
  }
}

export async function queryPagePermissionsWorld(): Promise<Array<{ permission: string; state: string }>> {
  const names = [
    'camera',
    'microphone',
    'geolocation',
    'notifications',
    'clipboard-read',
    'clipboard-write',
    'midi',
    'persistent-storage',
    'push',
    'idle-detection',
    'window-management',
  ]
  return Promise.all(
    names.map(async (name) => {
      try {
        if (!navigator.permissions?.query) return { permission: name, state: 'not_supported' }
        const status = await navigator.permissions.query({ name: name as PermissionName })
        return { permission: name, state: status.state }
      } catch {
        return { permission: name, state: 'not_supported' }
      }
    }),
  )
}
