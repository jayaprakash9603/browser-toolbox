import { fullPageOffsets } from '@/core/engines/capture/pageActions'
import {
  collectPageMeta,
  disableSmoothScroll,
  hideFixedStickyAfterFirst,
  prepareEntireCaptureScrollTarget,
  restoreCapturePageState,
  scrollCaptureTo,
  selectPageAreaWithScroll,
  pickElementRect,
} from '@/core/engines/capture/pageCaptureScript'
import { CAPTURE_THROTTLE_MS, sleep } from '@/core/screenshot/slicePlan'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import type { CaptureSlice, PageInfo, ScreenshotFrame } from '@/core/screenshot/types'
import { loadScreenshotSettings } from '@/core/screenshot/settings'

async function captureVisiblePng(windowId: number): Promise<string> {
  return chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
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
    title: tab.title ?? domain ?? 'Page',
    domain,
    capturedAt: Date.now(),
  }
}

async function canScriptTab(tabId: number, url?: string): Promise<boolean> {
  if (isRestrictedCaptureUrl(url)) return false
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => true,
    })
    return true
  } catch {
    return false
  }
}

export async function captureVisibleFrame(
  tab: chrome.tabs.Tab,
  notice?: string,
): Promise<ScreenshotFrame> {
  if (tab.windowId == null) throw new Error('No window for tab.')
  const dataUrl = await captureVisiblePng(tab.windowId)
  return {
    dataUrl,
    pageInfo: pageInfoFromTab(tab),
    notice,
  }
}

export async function captureEntirePageFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame> {
  const settings = await loadScreenshotSettings()
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')

  const scriptable = await canScriptTab(tab.id, tab.url)
  if (!scriptable) {
    return captureVisibleFrame(tab, 'This page only allows a visible capture.')
  }

  const [metricsResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: prepareEntireCaptureScrollTarget,
  })
  const metrics = metricsResult?.result
  if (!metrics) throw new Error('Could not read page metrics.')

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: disableSmoothScroll,
  })

  const savedScrollY = metrics.scrollY
  const offsets = fullPageOffsets(metrics.scrollHeight, metrics.viewportHeight)
  const slices: CaptureSlice[] = []

  try {
    for (let i = 0; i < offsets.length; i++) {
      if (i > 0 && settings.hideStickyHeaders) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: hideFixedStickyAfterFirst,
        })
      }
      const offset = offsets[i]
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrollCaptureTo,
        args: [offset],
      })
      await sleep(settings.scrollStepDelayMs)
      if (i > 0) await sleep(CAPTURE_THROTTLE_MS)
      const dataUrl = await captureVisiblePng(tab.windowId)
      const [scrolled] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrollCaptureTo,
        args: [offset],
      })
      slices.push({ dataUrl, scrollY: scrolled?.result ?? offset })
    }

    const [collected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectPageMeta,
    })
    const meta = collected?.result as {
      links: ScreenshotFrame['links']
      textRuns: ScreenshotFrame['textRuns']
    }

    return {
      slices,
      stitchHeight: metrics.scrollHeight,
      devicePixelRatio: metrics.devicePixelRatio,
      pageInfo: pageInfoFromTab(tab),
      links: meta?.links,
      textRuns: meta?.textRuns,
    }
  } finally {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: restoreCapturePageState,
      args: [savedScrollY],
    })
  }
}

export async function captureSelectionFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame | null> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  const scriptable = await canScriptTab(tab.id, tab.url)
  if (!scriptable) {
    return captureVisibleFrame(tab, 'Selection requires a normal web page; captured visible area.')
  }

  const [picked] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: selectPageAreaWithScroll,
  })
  const area = picked?.result
  if (!area) return null

  const settings = await loadScreenshotSettings()
  const [viewportH] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.innerHeight,
  })
  const vh = (viewportH?.result as number) || 800

  const scrollYs = fullPageOffsets(area.height, Math.min(vh, area.height))
  const slices: CaptureSlice[] = []

  for (let i = 0; i < scrollYs.length; i++) {
    const localY = scrollYs[i]
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (pageY: number, pageX: number) => {
        window.scrollTo(pageX, pageY)
      },
      args: [area.y + localY, area.x],
    })
    await sleep(settings.scrollStepDelayMs)
    if (i > 0) await sleep(CAPTURE_THROTTLE_MS)
    const dataUrl = await captureVisiblePng(tab.windowId)
    slices.push({ dataUrl, scrollY: localY })
  }

  return {
    slices,
    stitchHeight: area.height,
    devicePixelRatio: area.devicePixelRatio,
    pageInfo: pageInfoFromTab(tab),
  }
}

export async function captureElementFrame(tab: chrome.tabs.Tab): Promise<ScreenshotFrame | null> {
  if (tab.id == null || tab.windowId == null) throw new Error('Invalid tab.')
  const scriptable = await canScriptTab(tab.id, tab.url)
  if (!scriptable) {
    return captureVisibleFrame(tab, 'Element pick requires a normal web page; captured visible area.')
  }

  const [picked] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: pickElementRect,
  })
  const area = picked?.result
  if (!area) return null

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (top: number, left: number) => {
      window.scrollTo(left, top)
    },
    args: [Math.max(0, area.y - 40), Math.max(0, area.x - 40)],
  })
  await sleep(200)
  const dataUrl = await captureVisiblePng(tab.windowId)

  return {
    dataUrl,
    stitchHeight: area.height,
    devicePixelRatio: area.devicePixelRatio,
    pageInfo: pageInfoFromTab(tab),
    notice: 'Element capture — adjust crop in editor if needed.',
  }
}
