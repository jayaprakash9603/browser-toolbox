import { domainOf, type TabInfo } from './tabModel'

export interface ClosedTab {
  url: string
  windowId: number
  index: number
  pinned: boolean
}

export async function readTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({})
}

export async function currentWindowId(): Promise<number | null> {
  try {
    const win = await (chrome.windows.getCurrent?.() ?? chrome.windows.getLastFocused())
    return win?.id ?? null
  } catch {
    return null
  }
}

export async function focusTab(tab: TabInfo): Promise<void> {
  await chrome.tabs.update(tab.id, { active: true })
  await chrome.windows.update?.(tab.windowId, { focused: true })
}

export async function closeTabs(tabs: TabInfo[]): Promise<ClosedTab[]> {
  if (!tabs.length) return []
  const snapshot = tabs.map(({ url, windowId, index, pinned }) => ({ url, windowId, index, pinned }))
  await chrome.tabs.remove(tabs.map((t) => t.id))
  return snapshot
}

export async function restoreTabs(closed: ClosedTab[]): Promise<void> {
  for (const tab of [...closed].sort((a, b) => a.index - b.index)) {
    if (!tab.url) continue
    try {
      await chrome.tabs.create({ url: tab.url, windowId: tab.windowId, index: tab.index, pinned: tab.pinned, active: false })
    } catch {
      // The original window may be gone; fall back to the current one.
      await chrome.tabs.create({ url: tab.url, pinned: tab.pinned, active: false })
    }
  }
}

export async function setPinned(tabs: TabInfo[], pinned: boolean): Promise<void> {
  await Promise.all(tabs.map((t) => chrome.tabs.update(t.id, { pinned })))
}

export async function setMuted(tabs: TabInfo[], muted: boolean): Promise<void> {
  await Promise.all(tabs.map((t) => chrome.tabs.update(t.id, { muted })))
}

/** Unloads tabs from memory. The active tab of a window can't be discarded, so it's skipped. */
export async function sleepTabs(tabs: TabInfo[]): Promise<number> {
  const targets = tabs.filter((t) => !t.active && !t.discarded)
  const results = await Promise.allSettled(targets.map((t) => chrome.tabs.discard(t.id)))
  return results.filter((r) => r.status === 'fulfilled').length
}

export async function reloadTab(tab: TabInfo): Promise<void> {
  await chrome.tabs.reload(tab.id)
}

export async function duplicateTab(tab: TabInfo): Promise<void> {
  await chrome.tabs.duplicate(tab.id)
}

export async function moveToNewWindow(tabs: TabInfo[]): Promise<void> {
  const [first, ...rest] = tabs
  if (!first) return
  const win = await chrome.windows.create({ tabId: first.id, focused: true })
  if (rest.length && win?.id != null) await chrome.tabs.move(rest.map((t) => t.id), { windowId: win.id, index: -1 })
}

/** Reorders a window's tabs by domain, keeping pinned tabs in front in their own order. */
export async function sortWindowByDomain(tabs: TabInfo[]): Promise<void> {
  const ordered = [...tabs].sort((a, b) => a.index - b.index)
  const pinned = ordered.filter((t) => t.pinned)
  const rest = ordered
    .filter((t) => !t.pinned)
    .sort((a, b) => domainOf(a.url).localeCompare(domainOf(b.url)) || a.index - b.index)
  for (const [i, tab] of rest.entries()) await chrome.tabs.move(tab.id, { index: pinned.length + i })
}

export async function mergeWindowsInto(windowId: number, tabs: TabInfo[]): Promise<number> {
  const moving = tabs.filter((t) => t.windowId !== windowId).sort((a, b) => Number(b.pinned) - Number(a.pinned))
  let moved = 0
  for (const tab of moving) {
    try {
      await chrome.tabs.move(tab.id, { windowId, index: -1 })
      if (tab.pinned) await chrome.tabs.update(tab.id, { pinned: true })
      moved += 1
    } catch {
      // Tabs in special windows (e.g. app or devtools windows) can't be moved.
    }
  }
  return moved
}

export async function openUrls(urls: string[], windowId: number | null): Promise<void> {
  for (const url of urls) await chrome.tabs.create({ url, active: false, ...(windowId != null ? { windowId } : {}) })
}

const TAB_EVENTS = [
  'onCreated',
  'onRemoved',
  'onUpdated',
  'onMoved',
  'onActivated',
  'onAttached',
  'onDetached',
  'onReplaced',
] as const

/** Calls `onChange` (debounced) whenever any tab changes. Returns an unsubscribe function. */
export function watchTabs(onChange: () => void, delay = 150): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const handler = () => {
    clearTimeout(timer)
    timer = setTimeout(onChange, delay)
  }
  const events = TAB_EVENTS.map((name) => (chrome.tabs as unknown as Record<string, chrome.events.Event<() => void> | undefined>)[name])
  events.forEach((event) => event?.addListener(handler))
  return () => {
    clearTimeout(timer)
    events.forEach((event) => event?.removeListener(handler))
  }
}
