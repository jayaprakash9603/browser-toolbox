import {
  getTabScriptRuns,
  mergeScriptRun,
  scriptRunsKey,
  type ScriptRunReport,
} from '@/core/script-studio/runs'

import { clearTabBadge, noteScriptRan } from './badge'

const queues = new Map<number, Promise<void>>()

/** Serialises writes per tab so a navigation reset and the first reports of the new page never interleave. */
function enqueue(tabId: number, task: () => Promise<void>): Promise<void> {
  const next = (queues.get(tabId) ?? Promise.resolve()).then(task).catch(() => undefined)
  queues.set(tabId, next)
  void next.then(() => {
    if (queues.get(tabId) === next) queues.delete(tabId)
  })
  return next
}

export function recordScriptRun(
  tabId: number,
  scriptId: string,
  report: ScriptRunReport,
): Promise<void> {
  return enqueue(tabId, async () => {
    const runs = await getTabScriptRuns(tabId)
    runs[scriptId] = mergeScriptRun(runs[scriptId], scriptId, report)
    await chrome.storage.session.set({ [scriptRunsKey(tabId)]: runs })
    noteScriptRan(tabId, scriptId)
  })
}

function resetTabRuns(tabId: number): Promise<void> {
  return enqueue(tabId, async () => {
    await chrome.storage.session.remove(scriptRunsKey(tabId))
  })
}

export function registerScriptRunTracking(): void {
  if (!chrome.storage?.session) return
  chrome.webNavigation?.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return
    clearTabBadge(details.tabId)
    void resetTabRuns(details.tabId)
  })
  chrome.tabs.onRemoved.addListener((tabId) => {
    void resetTabRuns(tabId)
  })
}
