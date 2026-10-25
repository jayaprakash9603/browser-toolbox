import {
  getScriptCode,
  getScriptStudioIndex,
  getScriptStudioSettings,
  listActiveScripts,
  scriptMatchesUrl,
} from '@/core/script-studio'

const tabRunningCounts = new Map<number, Set<string>>()

export function noteScriptRan(tabId: number, scriptId: string): void {
  if (!tabRunningCounts.has(tabId)) tabRunningCounts.set(tabId, new Set())
  tabRunningCounts.get(tabId)!.add(scriptId)
  void updateBadgeForTab(tabId)
}

export async function updateBadgeForTab(tabId: number): Promise<void> {
  const settings = await getScriptStudioSettings()
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab?.url) {
    await chrome.action.setBadgeText({ tabId, text: '' })
    return
  }

  const index = await getScriptStudioIndex()
  if (!index.globalEnabled) {
    await chrome.action.setBadgeText({ tabId, text: '' })
    return
  }

  let count: number
  if (settings.badgeMode === 'total-installed') {
    count = (await listActiveScripts(index)).filter((s) => s.enabled).length
  } else if (settings.badgeMode === 'unique-running') {
    count = tabRunningCounts.get(tabId)?.size ?? 0
  } else if (settings.badgeMode === 'running-instances') {
    count = tabRunningCounts.get(tabId)?.size ?? 0
    if (count === 0) {
      for (const record of await listActiveScripts(index)) {
        if (!record.enabled) continue
        const code = await getScriptCode(record.id)
        if (code && scriptMatchesUrl(record, code, tab.url, settings)) count++
      }
    }
  } else {
    await chrome.action.setBadgeText({ tabId, text: '' })
    return
  }

  const text = count > 0 ? String(Math.min(count, 99)) : ''
  await chrome.action.setBadgeText({ tabId, text })
  if (text) await chrome.action.setBadgeBackgroundColor({ tabId, color: '#22c55e' })
}

export function clearTabBadge(tabId: number): void {
  tabRunningCounts.delete(tabId)
  void chrome.action.setBadgeText({ tabId, text: '' })
}
