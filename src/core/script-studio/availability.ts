export type UserScriptsStep = 'unsupported' | 'permission' | 'toggle' | 'ready'

export type UserScriptsProbe = {
  step: UserScriptsStep
  apiPresent: boolean
  permissionGranted: boolean
  operational: boolean
  error?: string
}

async function hasUserScriptsPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ permissions: ['userScripts'] })
  } catch {
    return false
  }
}

/**
 * Works from any extension context. Chrome reports the "Allow user scripts" toggle only through the
 * API itself: while it is off, `chrome.userScripts` is undefined or its calls throw.
 */
export async function probeUserScripts(): Promise<UserScriptsProbe> {
  const permissionGranted = await hasUserScriptsPermission()
  const api = typeof chrome !== 'undefined' ? chrome.userScripts : undefined

  if (api) {
    try {
      await api.getScripts()
      return { step: 'ready', apiPresent: true, permissionGranted: true, operational: true }
    } catch (error) {
      if (!permissionGranted) {
        return { step: 'permission', apiPresent: true, permissionGranted, operational: false }
      }
      return {
        step: 'toggle',
        apiPresent: true,
        permissionGranted,
        operational: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  if (!permissionGranted) return { step: 'permission', apiPresent: false, permissionGranted, operational: false }
  const major = Number(/Chrome\/(\d+)/.exec(navigator.userAgent)?.[1] ?? 0)
  if (major > 0 && major < 120) {
    return { step: 'unsupported', apiPresent: false, permissionGranted, operational: false }
  }
  return { step: 'toggle', apiPresent: false, permissionGranted, operational: false }
}

/** Must run inside a click handler: Chrome only shows the permission prompt for a user gesture. */
export async function requestUserScriptsPermission(): Promise<boolean> {
  try {
    if (await hasUserScriptsPermission()) return true
    return await chrome.permissions.request({ permissions: ['userScripts'] })
  } catch {
    return false
  }
}

export function extensionSettingsUrl(): string {
  return `chrome://extensions/?id=${chrome.runtime.id}`
}
