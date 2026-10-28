import { useEffect, useState } from 'react'

import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

export interface CaptureTarget {
  title: string
  url: string
  host: string
  favIconUrl?: string
  /** Browser pages, the Web Store and PDFs, which Chrome never lets extensions capture. */
  restricted: boolean
}

export interface CaptureTargetState {
  ready: boolean
  /** The active tab of this window, or null when there is none. */
  target: CaptureTarget | null
  /** Addresses of the tabs in this window that can be captured. */
  windowUrls: string[]
}

const WEB_URL = /^(https?|file):/i

function isCapturable(url: string | undefined): url is string {
  return Boolean(url && WEB_URL.test(url) && !isRestrictedCaptureUrl(url))
}

function hostOf(url: string): string {
  try {
    const { protocol, host } = new URL(url)
    return protocol === 'file:' ? 'Local file' : host
  } catch {
    return url
  }
}

function toTarget(tab: chrome.tabs.Tab | undefined): CaptureTarget | null {
  const url = tab?.url ?? tab?.pendingUrl
  if (!tab || !url) return null
  return {
    title: tab.title || hostOf(url),
    url,
    host: hostOf(url),
    favIconUrl: tab.favIconUrl,
    restricted: !isCapturable(url),
  }
}

async function readTarget(): Promise<Omit<CaptureTargetState, 'ready'>> {
  const [[active], tabs] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.tabs.query({ currentWindow: true }),
  ])
  return {
    target: toTarget(active),
    windowUrls: tabs.map((tab) => tab.url).filter(isCapturable),
  }
}

/** The page the launcher's capture buttons will capture, kept current as tabs change. */
export function useCaptureTarget(): CaptureTargetState {
  const [state, setState] = useState<CaptureTargetState>({ ready: false, target: null, windowUrls: [] })

  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void readTarget()
          .then((next) => live && setState({ ready: true, ...next }))
          .catch(() => live && setState({ ready: true, target: null, windowUrls: [] }))
      }, 80)
    }
    const onUpdated = (_tabId: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (info.url || info.title || info.favIconUrl || info.status === 'complete') refresh()
    }

    refresh()
    chrome.tabs.onActivated.addListener(refresh)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onCreated.addListener(refresh)
    chrome.tabs.onRemoved.addListener(refresh)
    return () => {
      live = false
      clearTimeout(timer)
      chrome.tabs.onActivated.removeListener(refresh)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onCreated.removeListener(refresh)
      chrome.tabs.onRemoved.removeListener(refresh)
    }
  }, [])

  return state
}
