export type ScreenshotAfterCapture = 'editor' | 'autosave' | 'clipboard'

export type ScreenshotAllTabsMode = 'visible' | 'entire'

export interface ScreenshotSettings {
  defaultFormat: 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'pdf'
  jpegQuality: number
  filenameTemplate: string
  afterCapture: ScreenshotAfterCapture
  hideStickyHeaders: boolean
  scrollStepDelayMs: number
  allTabsMode: ScreenshotAllTabsMode
  batchUrlDelayMs: number
  pageInfoStamp: boolean
  pageInfoPosition: 'header' | 'footer'
}

export const DEFAULT_SCREENSHOT_SETTINGS: ScreenshotSettings = {
  defaultFormat: 'png',
  jpegQuality: 0.92,
  filenameTemplate: '{title}-{date}-{time}.{ext}',
  afterCapture: 'editor',
  hideStickyHeaders: true,
  scrollStepDelayMs: 120,
  allTabsMode: 'entire',
  batchUrlDelayMs: 1500,
  pageInfoStamp: false,
  pageInfoPosition: 'footer',
}

const STORAGE_KEY = 'screenshotSettings'

export async function loadScreenshotSettings(): Promise<ScreenshotSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return { ...DEFAULT_SCREENSHOT_SETTINGS }
  }
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const raw = stored[STORAGE_KEY] as Partial<ScreenshotSettings> | undefined
  return { ...DEFAULT_SCREENSHOT_SETTINGS, ...raw }
}

export async function saveScreenshotSettings(
  patch: Partial<ScreenshotSettings>,
): Promise<ScreenshotSettings> {
  const current = await loadScreenshotSettings()
  const next = { ...current, ...patch }
  await chrome.storage.local.set({ [STORAGE_KEY]: next })
  return next
}
