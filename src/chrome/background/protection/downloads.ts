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

const MAX_GESTURE_HOSTS = 200
const lastGestureByHost = new Map<string, number>()
const handled = new Set<number>()

function hostVariants(host: string): string[] {
  const clean = host.toLowerCase().replace(/^www\./, '')
  const parts = clean.split('.')
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

async function openDownloadPrompt(params: Record<string, string>): Promise<void> {
  if (!chrome.windows?.create) return
  const url = chrome.runtime.getURL(`blocked.html?${new URLSearchParams({ mode: 'download', ...params })}`)
  try {
    await chrome.windows.create({ url, type: 'popup', width: 460, height: 420, focused: true })
  } catch (error) {
    logger.warn('open download prompt failed', error)
  }
}

async function inspect(item: chrome.downloads.DownloadItem): Promise<void> {
  if (handled.has(item.id) || item.byExtensionId === chrome.runtime.id) return
  const state = await getProtectionState()
  if (!state.enabled || !state.downloadGuard) return

  const hosts = itemHosts(item)
  const threatHost = await firstThreat(hosts)
  const verdict = assessDownload({
    filename: item.filename,
    url: item.finalUrl || item.url,
    mime: item.mime ?? '',
    userInitiated: hadRecentGesture(hosts),
    threatCategory: threatHost ? 'threat' : null,
  })
  if (verdict.action === 'allow') return
  handled.add(item.id)

  if (verdict.action === 'block') {
    try {
      await chrome.downloads.cancel(item.id)
    } catch {
      /* already finished or gone */
    }
    await recordProtectionBlock('download', threatHost ?? hosts[0] ?? 'unknown')
    await openDownloadPrompt({ blocked: '1', host: threatHost ?? '', file: fileLabel(item) })
    return
  }

  try {
    await chrome.downloads.pause(item.id)
  } catch {
    /* finished before it could be paused; the prompt can still delete it */
  }
  await openDownloadPrompt({ id: String(item.id), host: hosts[0] ?? '', file: fileLabel(item) })
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

export async function decideDownload(id: number, keep: boolean): Promise<void> {
  // only downloads this guard paused can be decided, so the prompt cannot touch other files
  if (!handled.delete(id)) return
  const [item] = await chrome.downloads.search({ id })
  if (!item) return
  if (keep) {
    if (item.state === 'in_progress' && item.paused) await chrome.downloads.resume(id)
    return
  }
  if (item.state === 'complete') {
    try {
      await chrome.downloads.removeFile(id)
    } catch {
      /* file already moved or deleted */
    }
  } else if (item.state === 'in_progress') {
    await chrome.downloads.cancel(id)
  }
  await chrome.downloads.erase({ id })
  await recordProtectionBlock('download', itemHosts(item)[0] ?? 'unknown')
}

export function registerDownloadGuard(): void {
  if (!chrome.downloads?.onCreated) return
  chrome.downloads.onCreated.addListener((item) => {
    void inspect(item).catch((error) => logger.warn('inspect failed', error))
  })
  // the target filename is often only known after the "determining filename" step
  chrome.downloads.onChanged.addListener((delta) => {
    if (!delta.filename?.current || handled.has(delta.id)) return
    void chrome.downloads
      .search({ id: delta.id })
      .then(([item]) => (item && item.state === 'in_progress' ? inspect(item) : undefined))
      .catch((error) => logger.warn('inspect failed', error))
  })
}
