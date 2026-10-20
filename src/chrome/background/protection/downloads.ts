import {
  assessDownload,
  DOWNLOAD_GESTURE_WINDOW_MS,
  downloadHost,
  getProtectionState,
  recordProtectionBlock,
} from '@/core/protection'
import { createLogger } from '@/core/logging'

import { threatCategoryForHost } from './rules'

const logger = createLogger('protection-downloads')

type Suggest = (suggestion?: chrome.downloads.FilenameSuggestion) => void

interface PendingDownload {
  suggest: Suggest
  host: string
  windowId?: number
}

const MAX_GESTURE_HOSTS = 200
const lastGestureByHost = new Map<string, number>()
/**
 * Downloads held in Chrome's "determining filename" step. Until `suggest` is called Chrome
 * writes nothing to the user's folder and does not show the Save As dialog.
 */
const pending = new Map<number, PendingDownload>()

function hostVariants(host: string): string[] {
  const clean = host.toLowerCase().replace(/^www\./, '')
  const parts = clean.split('.')
  if (parts.length < 2) return [clean]
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join('.'))
}

export function recordGesture(urls: (string | undefined)[]): void {
  const now = Date.now()
  for (const url of urls) {
    const host = url ? downloadHost(url) : ''
    if (!host) continue
    for (const variant of hostVariants(host)) lastGestureByHost.set(variant, now)
  }
  if (lastGestureByHost.size > MAX_GESTURE_HOSTS) {
    const cutoff = now - DOWNLOAD_GESTURE_WINDOW_MS
    for (const [host, at] of lastGestureByHost) if (at < cutoff) lastGestureByHost.delete(host)
  }
}

function hadRecentGesture(hosts: string[]): boolean {
  const cutoff = Date.now() - DOWNLOAD_GESTURE_WINDOW_MS
  return hosts.some((host) =>
    hostVariants(host).some((variant) => (lastGestureByHost.get(variant) ?? 0) >= cutoff),
  )
}

function itemHosts(item: chrome.downloads.DownloadItem): string[] {
  return [item.url, item.finalUrl, item.referrer]
    .map((url) => (url ? downloadHost(url) : ''))
    .filter(Boolean)
}

async function firstThreat(hosts: string[]): Promise<string | null> {
  for (const host of hosts) {
    if (await threatCategoryForHost(host)) return host
  }
  return null
}

function fileLabel(item: chrome.downloads.DownloadItem): string {
  const name = item.filename.split(/[\\/]/).pop()
  if (name) return name
  try {
    return new URL(item.finalUrl || item.url).pathname.split('/').pop() || ''
  } catch {
    return ''
  }
}

async function openDownloadPrompt(params: Record<string, string>): Promise<number | undefined> {
  if (!chrome.windows?.create) return undefined
  const query = new URLSearchParams({ mode: 'download', ...params })
  const url = chrome.runtime.getURL(`blocked.html?${query}`)
  try {
    const win = await chrome.windows.create({ url, type: 'popup', width: 440, height: 520, focused: true })
    return win?.id
  } catch (error) {
    logger.warn('open download prompt failed', error)
    return undefined
  }
}

async function cancelQuietly(id: number): Promise<void> {
  try {
    await chrome.downloads.cancel(id)
  } catch {
    /* already gone */
  }
}

async function inspect(item: chrome.downloads.DownloadItem, suggest: Suggest): Promise<void> {
  if (item.byExtensionId === chrome.runtime.id) return suggest()
  const state = await getProtectionState()
  if (!state.enabled || !state.downloadGuard) return suggest()

  const hosts = itemHosts(item)
  const threatHost = await firstThreat(hosts)
  const verdict = assessDownload({
    filename: item.filename,
    url: item.finalUrl || item.url,
    mime: item.mime ?? '',
    userInitiated: hadRecentGesture(hosts),
    threatCategory: threatHost ? 'threat' : null,
  })

  if (verdict.action === 'allow') return suggest()

  if (verdict.action === 'block') {
    await cancelQuietly(item.id)
    suggest()
    await recordProtectionBlock('download', threatHost ?? hosts[0] ?? 'unknown')
    await openDownloadPrompt({ blocked: '1', host: threatHost ?? '', file: fileLabel(item) })
    return
  }

  const entry: PendingDownload = { suggest, host: hosts[0] ?? '' }
  pending.set(item.id, entry)
  entry.windowId = await openDownloadPrompt({ id: String(item.id), host: entry.host, file: fileLabel(item) })
  // without a prompt there is nobody to ask, so the safe answer is no
  if (entry.windowId == null) await decideDownload(item.id, false)
}

export async function decideDownload(id: number, keep: boolean): Promise<void> {
  // only downloads this guard is holding can be decided, so the prompt cannot touch other files
  const entry = pending.get(id)
  if (!entry) return
  pending.delete(id)
  if (keep) {
    entry.suggest()
    return
  }
  await cancelQuietly(id)
  entry.suggest()
  try {
    await chrome.downloads.erase({ id })
  } catch {
    /* already erased */
  }
  await recordProtectionBlock('download', entry.host || 'unknown')
}

/** Chrome throws if a cancelled download is answered, and each download may be answered once. */
function onceSuggest(suggest: Suggest): Suggest {
  let called = false
  return (suggestion) => {
    if (called) return
    called = true
    try {
      suggest(suggestion)
    } catch {
      /* download already cancelled */
    }
  }
}

export function registerDownloadGuard(): void {
  if (!chrome.downloads?.onDeterminingFilename) return
  chrome.downloads.onDeterminingFilename.addListener((item, rawSuggest) => {
    const suggest = onceSuggest(rawSuggest)
    inspect(item, suggest).catch((error) => {
      logger.warn('inspect failed', error)
      if (!pending.has(item.id)) suggest()
    })
    return true
  })
  // closing the prompt without choosing counts as "delete"
  chrome.windows?.onRemoved?.addListener((windowId) => {
    for (const [id, entry] of pending) {
      if (entry.windowId === windowId) void decideDownload(id, false)
    }
  })
}
