import { fullPageOffsets, type AreaSelection } from '@/core/engines/capture/pageActions'
import {
  collectPageMeta,
  disableSmoothScroll,
  enableSmoothScroll,
  hideFixedStickyAfterFirst,
  hideToolboxUi,
  restoreToolboxUi,
  pickElementRect,
  prepareEntireCaptureScrollTarget,
  restoreCapturePageState,
  scrollCaptureTo,
  selectPageAreaWithScroll,
  showFixedSticky,
  type SelectionCaptureResult,
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
const selectionSliceCounts = new Map<number, number>()

/** captureVisibleTab is rate-limited (MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2). */
async function captureVisiblePng(windowId: number): Promise<string> {
  const wait = CAPTURE_THROTTLE_MS - (Date.now() - lastCaptureAt)
  if (wait > 0) await sleep(wait)
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/activeTab|cannot be scripted|permission/i.test(message)) {
      throw new Error('The browser does not allow capturing this page (browser and Web Store pages are protected).')
    }
    throw error
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

/** Keeps the extension's own overlays out of the image while `capture` runs. */
async function withToolboxUiHidden<T>(tabId: number, capture: () => Promise<T>): Promise<T> {
  await runInTab(tabId, hideToolboxUi).catch(() => undefined)
  try {
    return await capture()
  } finally {
    await runInTab(tabId, restoreToolboxUi).catch(() => undefined)
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
  const windowId = tab.windowId
  const dataUrl =
    tab.id != null
      ? await withToolboxUiHidden(tab.id, () => captureVisiblePng(windowId))
      : await captureVisiblePng(windowId)
  return { dataUrl, pageInfo: pageInfoFromTab(tab), notice }
}

export async function captureEntirePageFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  const tabId = tab.id
  if (!(await canScriptTab(tabId, tab.url))) {
    return captureVisibleFrame(tab, 'This page only allows a visible capture.')
  }
  const target = await runInTab(tabId, prepareEntireCaptureScrollTarget)
  if (!target) return captureVisibleFrame(tab, 'Could not measure the page; captured the visible part.')

  return withToolboxUiHidden(tabId, () => scrollAndCaptureTarget(tab, target))
}

async function scrollAndCaptureTarget(
  tab: chrome.tabs.Tab,
  target: Awaited<ReturnType<typeof prepareEntireCaptureScrollTarget>>,
): Promise<ScreenshotFrame> {
  const tabId = tab.id!
  const windowId = tab.windowId!
  const settings = await loadScreenshotSettings()
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
      const dataUrl = await captureVisiblePng(windowId)
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
  area: CaptureRect & { devicePixelRatio: number; savedScrollX?: number; savedScrollY?: number },
  notice?: string,
): Promise<ScreenshotFrame> {
  const tabId = tab.id!
  const windowId = tab.windowId!
  const settings = await loadScreenshotSettings()
  const viewport = await runInTab(tabId, readViewport)
  const saved = await runInTab(tabId, readWindowScroll)
  const offsets = fullPageOffsets(area.height, viewport.height)
  const slices: CaptureSlice[] = []
  await runInTab(tabId, disableSmoothScroll)
  try {
    for (let i = 0; i < offsets.length; i++) {
      if (i === 1 && settings.hideStickyHeaders) await runInTab(tabId, hideFixedStickyAfterFirst)
      const reached = await runInTab(tabId, scrollWindowTo, [area.x, area.y + offsets[i]])
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
    await runInTab(tabId, restoreCapturePageState, [saved.y]).catch(() => undefined)
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

async function captureFixedElementRegion(
  tab: chrome.tabs.Tab,
  area: CaptureRect & { devicePixelRatio: number },
): Promise<ScreenshotFrame> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  const tabId = tab.id
  const windowId = tab.windowId
  const viewport = await runInTab(tabId, readViewport)
  const dataUrl = await captureVisiblePng(windowId)
  return {
    slices: [
      {
        dataUrl,
        scrollX: 0,
        scrollY: 0,
        view: { x: 0, y: 0, width: viewport.width, height: viewport.height },
      },
    ],
    region: { x: area.x, y: area.y, width: area.width, height: area.height },
    stitchHeight: area.height,
    devicePixelRatio: area.devicePixelRatio,
    pageInfo: pageInfoFromTab(tab),
  }
}

async function captureElementScrollerRegion(tab: chrome.tabs.Tab, area: AreaSelection): Promise<ScreenshotFrame> {
  const tabId = tab.id!
  const windowId = tab.windowId!
  const settings = await loadScreenshotSettings()
  const cs = area.captureScroll!
  const view = cs.clip
  const offsets = fullPageOffsets(cs.scrollHeight, cs.viewportHeight)
  const slices: CaptureSlice[] = []
  await runInTab(tabId, disableSmoothScroll)
  try {
    for (let i = 0; i < offsets.length; i++) {
      if (i === 1 && settings.hideStickyHeaders) await runInTab(tabId, hideFixedStickyAfterFirst)
      const reached = await runInTab(tabId, scrollCaptureTo, [offsets[i]])
      await sleep(settings.scrollStepDelayMs)
      const dataUrl = await captureVisiblePng(windowId)
      slices.push({
        dataUrl,
        scrollY: reached ?? offsets[i],
        view,
      })
    }
  } finally {
    await runInTab(tabId, restoreCapturePageState, [cs.savedScrollTop]).catch(() => undefined)
    if (area.savedScrollX != null && area.savedScrollY != null) {
      await runInTab(tabId, scrollWindowTo, [area.savedScrollX, area.savedScrollY]).catch(() => undefined)
    }
  }
  return {
    slices,
    region: { x: area.x, y: area.y, width: area.width, height: area.height },
    stitchHeight: area.height,
    devicePixelRatio: area.devicePixelRatio,
    pageInfo: pageInfoFromTab(tab),
  }
}

export async function captureSelectionVisibleSlice(tab: chrome.tabs.Tab): Promise<CaptureSlice | null> {
  if (tab.id == null || tab.windowId == null) return null
  const tabId = tab.id
  const windowId = tab.windowId
  const taken = selectionSliceCounts.get(tabId) ?? 0
  selectionSliceCounts.set(tabId, taken + 1)
  if (taken >= 1 && (await loadScreenshotSettings()).hideStickyHeaders) {
    await runInTab(tabId, hideFixedStickyAfterFirst).catch(() => undefined)
  }
  const viewport = await runInTab(tabId, readViewport)
  const scroll = await runInTab(tabId, readWindowScroll)
  const dataUrl = await withToolboxUiHidden(tabId, () => captureVisiblePng(windowId))
  return {
    dataUrl,
    scrollX: scroll.x,
    scrollY: scroll.y,
    view: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  }
}

/** The first page-space y in the region that no slice shows, or null when the slices cover it all. */
export function findUncoveredScrollTarget<T extends { scrollY: number }>(
  slices: readonly T[],
  region: CaptureRect,
  viewportHeight: number,
): number | null {
  const end = region.y + region.height
  let cursor = region.y
  while (cursor < end - 0.5) {
    const covering = slices.filter(
      (slice) => slice.scrollY <= cursor + 1 && slice.scrollY + viewportHeight > cursor + 1,
    )
    if (covering.length === 0) return cursor
    cursor = Math.max(...covering.map((slice) => slice.scrollY)) + viewportHeight
  }
  return null
}

export function selectionSlicesCoverRegion<T extends { scrollY: number }>(
  slices: readonly T[],
  region: CaptureRect,
  viewportHeight: number,
): boolean {
  if (slices.length === 0 || viewportHeight <= 0) return false
  return findUncoveredScrollTarget(slices, region, viewportHeight) === null
}

async function captureMissingSelectionSlices(
  tab: chrome.tabs.Tab,
  result: SelectionCaptureResult,
  viewport: { width: number; height: number },
): Promise<CaptureSlice[]> {
  const tabId = tab.id!
  const windowId = tab.windowId!
  const settings = await loadScreenshotSettings()
  const slices: CaptureSlice[] = [...result.slices]
  const maxCaptures = Math.ceil(result.height / viewport.height) + 1
  let captured = 0
  let target = findUncoveredScrollTarget(slices, result, viewport.height)
  if (target === null) return slices

  await runInTab(tabId, disableSmoothScroll)
  if (settings.hideStickyHeaders && slices.length > 0) await runInTab(tabId, hideFixedStickyAfterFirst)
  while (target !== null && captured < maxCaptures) {
    const reached = await runInTab(tabId, scrollWindowTo, [result.savedScrollX, target])
    await sleep(settings.scrollStepDelayMs)
    const dataUrl = await captureVisiblePng(windowId)
    slices.push({ dataUrl, scrollX: reached.x, scrollY: reached.y, view: { x: 0, y: 0, width: viewport.width, height: viewport.height } })
    captured += 1
    const next = findUncoveredScrollTarget(slices, result, viewport.height)
    if (next !== null && next <= target) break
    target = next
  }
  return slices
}

async function frameFromSelection(
  tab: chrome.tabs.Tab,
  result: SelectionCaptureResult,
  notice?: string,
): Promise<ScreenshotFrame> {
  const tabId = tab.id!
  const viewport = await runInTab(tabId, readViewport)
  try {
    const slices = await captureMissingSelectionSlices(tab, result, viewport)
    slices.sort((a, b) => a.scrollY - b.scrollY)
    return {
      slices,
      region: { x: result.x, y: result.y, width: result.width, height: result.height },
      stitchHeight: result.height,
      devicePixelRatio: result.devicePixelRatio,
      pageInfo: pageInfoFromTab(tab),
      notice,
    }
  } finally {
    await runInTab(tabId, showFixedSticky).catch(() => undefined)
    await runInTab(tabId, enableSmoothScroll).catch(() => undefined)
    await runInTab(tabId, scrollWindowTo, [result.savedScrollX, result.savedScrollY]).catch(() => undefined)
  }
}

export async function captureSelectionFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame | null> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  if (!(await canScriptTab(tab.id, tab.url))) {
    return captureVisibleFrame(tab, 'Selection requires a normal web page; captured visible area.')
  }
  const tabId = tab.id
  selectionSliceCounts.set(tabId, 0)
  let result: SelectionCaptureResult | null
  try {
    result = await runInTab(tabId, selectPageAreaWithScroll)
  } finally {
    selectionSliceCounts.delete(tabId)
  }
  if (!result) {
    await runInTab(tabId, showFixedSticky).catch(() => undefined)
    return null
  }
  return withToolboxUiHidden(tabId, () => frameFromSelection(tab, result))
}

export async function captureElementFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame | null> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  if (!(await canScriptTab(tab.id, tab.url))) {
    return captureVisibleFrame(tab, 'Element pick requires a normal web page; captured visible area.')
  }
  const area = await runInTab(tab.id, pickElementRect)
  if (!area) return null
  return withToolboxUiHidden(tab.id, () => {
    if (area.captureScroll) return captureElementScrollerRegion(tab, area)
    if (area.fixedViewport) return captureFixedElementRegion(tab, area)
    return captureWindowRegion(tab, area)
  })
}
