import {
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  TabMessagingError,
} from '@/chrome/contentScriptClient'
import { captureSelectorSnapshot } from '@/core/engines/selector-studio/capture'
import {
  evaluateSelectorsInPage,
  type InPageEvaluation,
  type InPageHighlightResult,
  type InPageQuery,
} from '@/core/engines/selector-studio/inPage'
import {
  captureElementInspect,
  captureInspectByIdentity,
  type ElementInspect,
} from '@/core/engines/selector-studio/inspect'
import type { SelectorSnapshot } from '@/core/engines/selector-studio/types'

const PICK_KEY = 'toolbox.pickedElement'

export interface PickedStore {
  snapshot?: SelectorSnapshot
}

export interface StudioPageClient {
  kind: 'devtools' | 'side-panel'
  resolveTab(): Promise<{ tabId: number; url?: string } | null>
  startPicker(): Promise<void>
  cancelPicker(): Promise<void>
  readPicked(): Promise<PickedStore | null>
  subscribePicked(listener: (value: PickedStore | null) => void): () => void
  evaluate(queries: InPageQuery[], identityPath: string | null): Promise<InPageEvaluation[]>
  highlight(
    kind: 'css' | 'xpath',
    expression: string,
    identityPath: string | null,
  ): Promise<InPageHighlightResult>
  clearHighlights(): Promise<void>
  captureDollarZero(): Promise<SelectorSnapshot | null>
  inspectElement(identityPath: string | null): Promise<ElementInspect | null>
  inspectCurrent(): Promise<void>
  onNavigated(listener: () => void): () => void
  onSelectionChanged(listener: () => void): () => void
}

function storageArea(): chrome.storage.StorageArea | undefined {
  return chrome.storage?.session ?? chrome.storage?.local
}

async function readPicked(): Promise<PickedStore | null> {
  const area = storageArea()
  if (!area) return null
  const stored = (await area.get(PICK_KEY)) as Record<string, PickedStore | undefined>
  return stored[PICK_KEY] ?? null
}

function subscribePicked(listener: (value: PickedStore | null) => void): () => void {
  const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'session' && area !== 'local') return
    if (!changes[PICK_KEY]) return
    listener((changes[PICK_KEY].newValue as PickedStore | undefined) ?? null)
  }
  chrome.storage?.onChanged?.addListener(onChange)
  return () => chrome.storage?.onChanged?.removeListener(onChange)
}

async function runInTab<T, Args extends unknown[]>(
  tabId: number,
  func: (...args: Args) => T,
  args: Args,
): Promise<T | undefined> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  })
  return injection?.result as T | undefined
}

function createShared(kind: StudioPageClient['kind'], tabIdOf: () => Promise<number | null>): StudioPageClient {
  return {
    kind,
    async resolveTab() {
      const tabId = await tabIdOf()
      if (tabId == null) return null
      const tab = await chrome.tabs.get(tabId).catch(() => undefined)
      return { tabId, url: tab?.url }
    },
    async startPicker() {
      const tabId = await tabIdOf()
      if (tabId == null) throw new TabMessagingError('NO_TAB')
      const tab = await chrome.tabs.get(tabId).catch(() => undefined)
      const restricted = classifyTabUrl(tab?.url)
      if (restricted) throw new TabMessagingError(restricted)
      await ensureContentScriptInTab(tabId, { allFrames: true })
      await chrome.tabs.sendMessage(tabId, { type: 'PICK_ELEMENT_START' })
    },
    async cancelPicker() {
      const tabId = await tabIdOf()
      if (tabId == null) return
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PICK_ELEMENT_CANCEL' })
      } catch {
        /* picker was not running */
      }
    },
    readPicked,
    subscribePicked,
    async evaluate(queries, identityPath) {
      const tabId = await tabIdOf()
      if (tabId == null) throw new TabMessagingError('NO_TAB')
      const result = await runInTab(tabId, evaluateSelectorsInPage, [queries, identityPath])
      return result ?? []
    },
    async inspectElement(identityPath) {
      const tabId = await tabIdOf()
      if (tabId == null) return null
      return (await runInTab(tabId, captureInspectByIdentity, [identityPath])) ?? null
    },
    async highlight(kind, expression, identityPath) {
      const tabId = await tabIdOf()
      if (tabId == null) return { count: 0, error: 'No tab' }
      await ensureContentScriptInTab(tabId)
      try {
        const response = (await chrome.tabs.sendMessage(tabId, {
          type: 'SELECTOR_STUDIO_HIGHLIGHT',
          kind,
          expression,
          identityPath: identityPath ?? undefined,
        })) as { ok?: boolean; data?: InPageHighlightResult }
        return response?.data ?? { count: 0 }
      } catch {
        return { count: 0, error: 'Highlight unavailable' }
      }
    },
    async clearHighlights() {
      const tabId = await tabIdOf()
      if (tabId == null) return
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'SELECTOR_STUDIO_CLEAR' })
      } catch {
        /* overlay was not present */
      }
    },
    async captureDollarZero() {
      return null
    },
    async inspectCurrent() {
      /* DevTools only */
    },
    onNavigated(listener) {
      if (!chrome.tabs?.onUpdated) return () => undefined
      const onUpdated = (updatedId: number, info: { status?: string; url?: string }) => {
        void tabIdOf().then((current) => {
          if (current != null && updatedId === current && (info.status === 'loading' || info.url)) {
            listener()
          }
        })
      }
      chrome.tabs.onUpdated.addListener(onUpdated)
      return () => chrome.tabs.onUpdated.removeListener(onUpdated)
    },
    onSelectionChanged() {
      return () => undefined
    },
  }
}

export function createSidePanelClient(): StudioPageClient {
  return createShared('side-panel', async () => {
    const tab = await getActiveBrowserTab()
    return tab?.id ?? null
  })
}

export function createDevToolsClient(): StudioPageClient {
  const tabId = () => chrome.devtools?.inspectedWindow?.tabId ?? null
  const client = createShared('devtools', async () => tabId())
  client.captureDollarZero = () =>
    new Promise((resolve) => {
      const inspected = chrome.devtools?.inspectedWindow
      if (!inspected) {
        resolve(null)
        return
      }
      inspected.eval(
        `($0 && $0.nodeType === 1) ? (${captureSelectorSnapshot.toString()})($0) : null`,
        (result, exception) => {
          if (exception || !result || typeof result !== 'object') resolve(null)
          else resolve(result as unknown as SelectorSnapshot)
        },
      )
    })
  client.inspectElement = (identityPath) =>
    new Promise((resolve) => {
      const inspected = chrome.devtools?.inspectedWindow
      if (!inspected) {
        resolve(null)
        return
      }
      inspected.eval(
        `($0 && $0.nodeType === 1) ? (${captureElementInspect.toString()})($0) : (${captureInspectByIdentity.toString()})(${JSON.stringify(identityPath)})`,
        (result, exception) => {
          if (exception || !result || typeof result !== 'object') resolve(null)
          else resolve(result as unknown as ElementInspect)
        },
      )
    })
  client.inspectCurrent = async () => {
    const inspected = chrome.devtools?.inspectedWindow
    if (!inspected) return
    inspected.eval('inspect($0)', () => undefined)
  }
  client.onNavigated = (listener) => {
    const net = chrome.devtools?.network
    if (!net?.onNavigated) return () => undefined
    net.onNavigated.addListener(listener)
    return () => net.onNavigated.removeListener(listener)
  }
  client.onSelectionChanged = (listener) => {
    const elements = chrome.devtools?.panels?.elements
    if (!elements?.onSelectionChanged) return () => undefined
    elements.onSelectionChanged.addListener(listener)
    return () => elements.onSelectionChanged.removeListener(listener)
  }
  return client
}
