import { base64ToBytes, bytesToBase64 } from '@/core/engines/htmlArchive'
import { getChromeMessage } from '@/core/i18n/chromeMessages'
import {
  FORMAT_LABELS,
  IMAGE_SAVE_MENU_PARENT,
  formatFromMenuId,
  getSaveImageAsState,
  imageSaveMenuId,
  suggestFilename,
  type ImageSaveFormat,
} from '@/core/imageConvert'
import { createLogger } from '@/core/logging'
import { downloadWithName } from './downloadNames'
import type { ExtensionResponse } from '@/core/messaging/types'

const logger = createLogger('image-convert')
const OFFSCREEN_PATH = 'offscreen.html'

export async function buildImageConvertMenus(): Promise<void> {
  const state = await getSaveImageAsState()
  if (!state.enabled || !state.formats.length) return

  chrome.contextMenus.create({
    id: IMAGE_SAVE_MENU_PARENT,
    title: getChromeMessage('contextMenuSaveImageAs') || 'Save image as',
    contexts: ['image'],
  })
  for (const format of state.formats) {
    chrome.contextMenus.create({
      id: imageSaveMenuId(format),
      parentId: IMAGE_SAVE_MENU_PARENT,
      title: FORMAT_LABELS[format],
      contexts: ['image'],
    })
  }
}

export function isImageConvertMenuItem(menuItemId: string): boolean {
  return menuItemId === IMAGE_SAVE_MENU_PARENT || formatFromMenuId(menuItemId) != null
}

export async function handleImageConvertMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  const format = formatFromMenuId(String(info.menuItemId))
  if (!format || !info.srcUrl) return

  const state = await getSaveImageAsState()
  if (!state.enabled) return

  try {
    const { bytes, mime } = await fetchImageBytes(info.srcUrl, tab?.id)
    const { url } = await convertBytes(bytes, mime, format, state.quality)
    const filename = suggestFilename(format, {
      pageTitle: tab?.title,
      imageUrl: info.srcUrl,
      pageUrl: info.pageUrl ?? tab?.url,
    })
    await downloadConverted(url, filename, state.askFilename)
  } catch (error) {
    logger.warn('image convert failed', error)
    const reason = error instanceof Error ? error.message : String(error)
    notify('Could not convert image', `${reason}. Downloading the original file instead.`)
    try {
      const filename = suggestFilename(format, {
        pageTitle: tab?.title,
        imageUrl: info.srcUrl,
        pageUrl: info.pageUrl ?? tab?.url,
      })
      await downloadWithName({ url: info.srcUrl, filename, saveAs: state.askFilename })
    } catch (fallbackError) {
      logger.warn('fallback download failed', fallbackError)
      notify('Image download failed', 'Check page permissions or try another image.')
    }
  }
}

async function fetchImageBytes(
  url: string,
  tabId?: number,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (url.startsWith('data:')) {
    const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/i.exec(url)
    if (!match) throw new Error('Invalid data URL')
    const mime = match[1] || 'application/octet-stream'
    const payload = match[2]
    if (url.includes(';base64,')) {
      return { bytes: base64ToBytes(payload), mime }
    }
    return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), mime }
  }

  try {
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
    if (res.ok) {
      const mime = res.headers.get('content-type') || guessMime(url)
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime }
    }
  } catch {
    /* try in-page fetch */
  }

  if (tabId == null) throw new Error('Could not fetch image')
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (src: string) => {
      const res = await fetch(src, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      return { base64: btoa(binary), mime: res.headers.get('content-type') || '' }
    },
    args: [url],
  })
  const payload = result as { base64?: string; mime?: string } | undefined
  if (!payload?.base64) throw new Error('In-page fetch failed')
  return { bytes: base64ToBytes(payload.base64), mime: payload.mime || guessMime(url) }
}

function guessMime(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('.png')) return 'image/png'
  if (lower.includes('.webp')) return 'image/webp'
  if (lower.includes('.gif')) return 'image/gif'
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

async function convertBytes(
  bytes: Uint8Array,
  sourceMime: string,
  format: ImageSaveFormat,
  quality: number,
): Promise<{ url: string; mime: string }> {
  await ensureOffscreenDocument()
  return request<{ url: string; mime: string }>(() =>
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_IMAGE_CONVERT',
      base64: bytesToBase64(bytes),
      sourceMime,
      format,
      quality,
    }),
  )
}

async function ensureOffscreenDocument(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  })
  if (contexts.length > 0) return
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification: 'Convert images locally before download.',
  })
}

/** Service workers cannot create blob URLs, so the offscreen page owns them until the download ends. */
async function downloadConverted(url: string, filename: string, saveAs: boolean): Promise<void> {
  const release = () => void chrome.runtime.sendMessage({ type: 'OFFSCREEN_IMAGE_RELEASE', url }).catch(() => {})
  let downloadId: number
  try {
    downloadId = await downloadWithName({ url, filename, saveAs, conflictAction: 'uniquify' })
  } catch (error) {
    release()
    throw error
  }
  const onChanged = (delta: chrome.downloads.DownloadDelta) => {
    if (delta.id !== downloadId) return
    const s = delta.state?.current
    if (s !== 'complete' && s !== 'interrupted') return
    chrome.downloads.onChanged.removeListener(onChanged)
    release()
  }
  chrome.downloads.onChanged.addListener(onChanged)
}

async function request<T>(send: () => Promise<unknown>): Promise<T> {
  const response = (await send()) as ExtensionResponse<T> | undefined
  if (!response) throw new Error('No response from offscreen.')
  if (!response.ok) throw new Error(response.error)
  return response.data
}

function notify(title: string, message: string): void {
  void chrome.notifications.create(`img-save-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'public/icons/icon128.png',
    title,
    message,
  })
}

let rebuildContextMenus: (() => Promise<void>) | null = null

export function bindImageConvertMenuRebuild(fn: () => Promise<void>): void {
  rebuildContextMenus = fn
}

export function registerImageConvert(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.saveImageAs) return
    void rebuildContextMenus?.()
  })
}
