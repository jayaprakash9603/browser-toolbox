export function getHostPermissionPattern(value: string): string | null {
  try {
    const url = new URL(value)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null
    }
    return `${url.protocol}//${url.hostname}/*`
  } catch {
    return null
  }
}

export async function hasHostAccess(value: string): Promise<boolean> {
  const pattern = getHostPermissionPattern(value)
  if (!pattern) return false
  return chrome.permissions.contains({ origins: [pattern] })
}

export async function requestHostAccess(value: string): Promise<boolean> {
  const pattern = getHostPermissionPattern(value)
  if (!pattern) return false
  return chrome.permissions.request({ origins: [pattern] })
}