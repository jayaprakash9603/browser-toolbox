import { createLogger } from '@/core/logging'

const logger = createLogger('script-studio-availability')

export type UserScriptsAvailability = {
  apiPresent: boolean
  permissionGranted: boolean
  operational: boolean
  error?: string
}

export async function requestUserScriptsPermission(): Promise<boolean> {
  try {
    const has = await chrome.permissions.contains({ permissions: ['userScripts'] })
    if (has) return true
    return await chrome.permissions.request({ permissions: ['userScripts'] })
  } catch (error) {
    logger.warn('userScripts permission request failed', error)
    return false
  }
}

export async function probeUserScripts(): Promise<UserScriptsAvailability> {
  const apiPresent = Boolean(chrome.userScripts)
  let permissionGranted = false
  try {
    permissionGranted = await chrome.permissions.contains({ permissions: ['userScripts'] })
  } catch {
    permissionGranted = false
  }

  if (!apiPresent) {
    return {
      apiPresent: false,
      permissionGranted,
      operational: false,
      error: 'chrome.userScripts is not available in this browser.',
    }
  }

  if (!permissionGranted) {
    return {
      apiPresent: true,
      permissionGranted: false,
      operational: false,
      error: 'Enable Script Studio user scripts in extension permissions.',
    }
  }

  try {
    await chrome.userScripts.configureWorld({ messaging: true })
    await chrome.userScripts.getScripts()
    return { apiPresent: true, permissionGranted: true, operational: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      apiPresent: true,
      permissionGranted,
      operational: false,
      error:
        msg.includes('Allow') || msg.includes('user script')
          ? 'Turn on “Allow user scripts” for One Panel in chrome://extensions, or enable Developer mode.'
          : msg,
    }
  }
}
