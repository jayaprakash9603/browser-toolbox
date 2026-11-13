export const RV_SYNC_SOURCE = 'tbx-rv-sync'

export type SyncMessage =
  | { source: typeof RV_SYNC_SOURCE; type: 'scroll'; from: string; x: number; y: number }
  | { source: typeof RV_SYNC_SOURCE; type: 'click'; from: string; x: number; y: number; selector?: string }
  | { source: typeof RV_SYNC_SOURCE; type: 'navigate'; from: string; href: string }

export function isSyncMessage(value: unknown): value is SyncMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as SyncMessage).source === RV_SYNC_SOURCE &&
      typeof (value as SyncMessage).type === 'string' &&
      typeof (value as SyncMessage).from === 'string',
  )
}

/** Injected into preview frames when the user has granted site access. */
export function installFrameSync() {
  const flag = '__tbxRvSyncInstalled'
  const win = window as unknown as Record<string, unknown>
  if (win[flag]) return
  win[flag] = true
  const frameId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  let lastScroll = 0
  window.addEventListener(
    'scroll',
    () => {
      const now = Date.now()
      if (now - lastScroll < 40) return
      lastScroll = now
      window.parent.postMessage(
        { source: RV_SYNC_SOURCE, type: 'scroll', from: frameId, x: window.scrollX, y: window.scrollY } satisfies SyncMessage,
        '*',
      )
    },
    { passive: true },
  )
  window.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null
      window.parent.postMessage(
        {
          source: RV_SYNC_SOURCE,
          type: 'click',
          from: frameId,
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
          selector: target ? cssPath(target) : undefined,
        } satisfies SyncMessage,
        '*',
      )
    },
    true,
  )
  window.addEventListener('message', (event) => {
    const data = event.data as SyncMessage | undefined
    if (!isSyncMessage(data) || data.from === frameId) return
    if (data.type === 'scroll') window.scrollTo({ left: data.x, top: data.y, behavior: 'auto' })
    if (data.type === 'click') {
      const x = data.x * window.innerWidth
      const y = data.y * window.innerHeight
      const node =
        (data.selector ? document.querySelector(data.selector) : null) ?? document.elementFromPoint(x, y)
      if (node instanceof HTMLElement) node.click()
    }
    if (data.type === 'navigate' && data.href && window.location.href !== data.href) {
      window.location.href = data.href
    }
  })
}

function cssPath(element: Element): string | undefined {
  if (element.id) return `#${CSS.escape(element.id)}`
  const testId = element.getAttribute('data-testid')
  if (testId) return `[data-testid="${CSS.escape(testId)}"]`
  return undefined
}

export async function injectSyncIntoStudio(tabId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) return false
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: installFrameSync,
    })
    return true
  } catch {
    return false
  }
}

export type OverflowHit = {
  selector: string
  width: number
  available: number
  overflow: number
}

export function scanOverflow(): OverflowHit[] {
  const available = document.documentElement.clientWidth
  const hits: OverflowHit[] = []
  const nodes = document.querySelectorAll('body *')
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const width = Math.round(node.getBoundingClientRect().width)
    if (width > available + 2) {
      hits.push({
        selector: node.id ? `#${node.id}` : `${node.tagName.toLowerCase()}${node.className ? `.${String(node.className).trim().split(/\s+/)[0]}` : ''}`,
        width,
        available,
        overflow: width - available,
      })
    }
    if (hits.length >= 40) break
  }
  return hits
}

export async function scanOverflowInTab(tabId: number): Promise<OverflowHit[] | { error: string }> {
  if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
    return { error: 'Overflow checks need the extension scripting API.' }
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: scanOverflow,
    })
    return results.flatMap((entry) => entry.result ?? [])
  } catch {
    return { error: 'Cross-origin frames cannot be inspected until this site is allowed.' }
  }
}

export type PageMetrics = {
  viewport: { width: number; height: number }
  document: { width: number; height: number }
  dpr: number
  orientation: string
  scroll: { x: number; y: number }
}

export function readPageMetrics(): PageMetrics {
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    dpr: window.devicePixelRatio,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    scroll: { x: window.scrollX, y: window.scrollY },
  }
}

export async function readMetricsInTab(tabId: number): Promise<PageMetrics | { error: string }> {
  if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
    return { error: 'Page metrics need the extension scripting API.' }
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: readPageMetrics,
    })
    return results[0]?.result ?? { error: 'No metrics returned.' }
  } catch {
    return { error: 'This origin has not been granted to One Panel.' }
  }
}
