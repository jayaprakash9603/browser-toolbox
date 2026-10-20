const tabCounts = new Map<number, number>()

export function incrementTabRuleCount(tabId: number): void {
  if (tabId < 0) return
  const next = (tabCounts.get(tabId) ?? 0) + 1
  tabCounts.set(tabId, next)
  void chrome.action.setBadgeText({ text: String(next), tabId })
  void chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId })
}

export function clearTabBadge(tabId: number): void {
  tabCounts.delete(tabId)
  void chrome.action.setBadgeText({ text: '', tabId })
}

export function resetAllBadges(): void {
  tabCounts.clear()
  void chrome.action.setBadgeText({ text: '' })
}
