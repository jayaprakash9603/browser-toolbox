import { fullPageOffsets } from '@/core/engines/capture/pageActions'
import {
  collectPageMeta,
  disableSmoothScroll,
  hideFixedStickyAfterFirst,
  pickElementRect,
  prepareEntireCaptureScrollTarget,
  restoreCapturePageState,
  scrollCaptureTo,
  selectPageAreaWithScroll,
} from '@/core/engines/capture/pageCaptureScript'
import { CAPTURE_THROTTLE_MS, sleep } from '@/core/screenshot/slicePlan'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import type {
  CaptureRect,
  CaptureSlice,
  PageInfo,
  ScreenshotFrame,
} from '@/core/screenshot/types'
import { loadScreenshotSettings } from '@/core/screenshot/settings'

let lastCaptureAt = 0

/** captureVisibleTab is rate-limited (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2). */
async function captureVisiblePng(windowId: number): Promise<string> {
  const wait = CAPTURE_THROTTLE_MS - (Date.now() - lastCaptureAt)
  if (wait > 0) await sleep(wait)
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
  } finally {
    lastCaptureAt = Date.now()
  }
}

async function runInTab<Args extends unknown[], Result>(
  tabId: number,
  func: (...args: Args) => Result,
  args?: Args,
): Promise<Awaited<Result>> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args: (args ?? []) as Args,
  } as chrome.scripting.ScriptInjection<Args, Result>)
  return injection?.result as Awaited<Result>
}

function pageInfoFromTab(tab: chrome.tabs.Tab): PageInfo {
  const url = tab.url ?? ''
  let domain = ''
  try {
    domain = new URL(url).hostname
  } catch {
    domain = ''
  }
  return {
    url,
    title: tab.title || domain || 'Page',
    domain,
    capturedAt: Date.now(),
  }
}

async function canScriptTab(tabId: number, url?: string): Promise<boolean> {
  if (isRestrictedCaptureUrl(url)) return false
  try {
    await runInTab(tabId, () => true)
    return true
  } catch {
    return false
  }
}

function readViewport(): { width: number; height: number; dpr: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  }
}

function scrollWindowTo(x: number, y: number): { x: number; y: number } {
  window.scrollTo(x, y)
  return { x: window.scrollX, y: window.scrollY }
}

function readWindowScroll(): { x: number; y: number } {
  return { x: window.scrollX, y: window.scrollY }
}

export async function captureVisibleFrame(
  tab: chrome.tabs.Tab,
  notice?: string,
): Promise<ScreenshotFrame> {
  if (tab.windowId == null) throw new Error('No window for tab.')
  const dataUrl = await captureVisiblePng(tab.windowId)
  return { dataUrl, pageInfo: pageInfoFromTab(tab), notice }
}

export async function captureEntirePageFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  const tabId = tab.id
  if (!(await canScriptTab(tabId, tab.url))) {
    return captureVisibleFrame(tab, 'This page only allows a visible capture.')
  }
  const settings = await loadScreenshotSettings()

  const target = await runInTab(tabId, prepareEntireCaptureScrollTarget)
  if (!target) return captureVisibleFrame(tab, 'Could not measure the page; captured the visible part.')

  await runInTab(tabId, disableSmoothScroll)
  const view: CaptureRect = target.clip ?? {
    x: 0,
    y: 0,
    width: target.viewportWidth,
    height: target.viewportHeight,
  }
  const offsets = fullPageOffsets(target.scrollHeight, view.height)
  const slices: CaptureSlice[] = []

  try {
    for (let i = 0; i < offsets.length; i++) {
      if (i === 1 && settings.hideStickyHeaders) await runInTab(tabId, hideFixedStickyAfterFirst)
      const reached = await runInTab(tabId, scrollCaptureTo, [offsets[i]])
      await sleep(settings.scrollStepDelayMs)
      const dataUrl = await captureVisiblePng(tab.windowId)
      slices.push({ dataUrl, scrollY: reached ?? offsets[i], view })
    }

    let meta: Awaited<ReturnType<typeof collectPageMeta>> | undefined
    if (target.scrollTarget === 'window') {
      try {
        meta = await runInTab(tabId, collectPageMeta)
      } catch {
        meta = undefined
      }
    }

    return {
      slices,
      region: { x: 0, y: 0, width: view.width, height: target.scrollHeight },
      stitchHeight: target.scrollHeight,
      devicePixelRatio: target.devicePixelRatio,
      pageInfo: pageInfoFromTab(tab),
      links: meta?.links,
      textRuns: meta?.textRuns,
    }
  } finally {
    await runInTab(tabId, restoreCapturePageState, [target.scrollY]).catch(() => undefined)
  }
}

/** Scrolls the window over a page-space rectangle and captures every viewport it spans. */
async function captureWindowRegion(
  tab: chrome.tabs.Tab,
  area: CaptureRect & { devicePixelRatio: number },
  notice?: string,
): Promise<ScreenshotFrame> {
  const tabId = tab.id!
  const windowId = tab.windowId!
  const settings = await loadScreenshotSettings()
  const viewport = await runInTab(tabId, readViewport)
  const saved = await runInTab(tabId, readWindowScroll)
  const offsets = fullPageOffsets(area.height, viewport.height)
  const slices: CaptureSlice[] = []
  try {
    for (const localY of offsets) {
      const reached = await runInTab(tabId, scrollWindowTo, [area.x, area.y + localY])
      await sleep(settings.scrollStepDelayMs)
      const dataUrl = await captureVisiblePng(windowId)
      slices.push({
        dataUrl,
        scrollX: reached.x,
        scrollY: reached.y,
        view: { x: 0, y: 0, width: viewport.width, height: viewport.height },
      })
    }
  } finally {
    await runInTab(tabId, scrollWindowTo, [saved.x, saved.y]).catch(() => undefined)
  }
  return {
    slices,
    region: { x: area.x, y: area.y, width: area.width, height: area.height },
    stitchHeight: area.height,
    devicePixelRatio: area.devicePixelRatio,
    pageInfo: pageInfoFromTab(tab),
    notice,
  }
}

export async function captureSelectionFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame | null> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  if (!(await canScriptTab(tab.id, tab.url))) {
    return captureVisibleFrame(tab, 'Selection requires a normal web page; captured visible area.')
  }
  const area = await runInTab(tab.id, selectPageAreaWithScroll)
  if (!area) return null
  return captureWindowRegion(tab, area)
}

export async function captureElementFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame | null> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  if (!(await canScriptTab(tab.id, tab.url))) {
    return captureVisibleFrame(tab, 'Element pick requires a normal web page; captured visible area.')
  }
  const area = await runInTab(tab.id, pickElementRect)
  if (!area) return null
  return captureWindowRegion(tab, area)
}
