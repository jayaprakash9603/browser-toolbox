import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import {
  PIP_MENU_ID,
  getPipState,
  pickBestVideoCandidate,
  type PipToggleResult,
  type VideoCandidate,
} from '@/core/pip'
import { pipEnterInFrame, pipMeasureInFrame, pipTryExitInFrame } from '@/core/pip/pageScripts'

import { syncPipAutoContentScript } from './pipContentScripts'

const logger = createLogger('pip')

function isRestrictedUrl(url?: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'chrome:' ||
      parsed.protocol === 'chrome-extension:' ||
      parsed.protocol === 'edge:' ||
      parsed.protocol === 'about:'
    )
  } catch {
    return true
  }
}

function notify(title: string, message: string): void {
  void chrome.notifications.create(`pip-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'public/icons/icon128.png',
    title,
    message,
  })
}

export async function togglePipInTab(tab?: chrome.tabs.Tab): Promise<PipToggleResult> {
  const state = await getPipState()
  if (!state.enabled) return { action: 'none' }
  if (!tab?.id || isRestrictedUrl(tab.url)) return { action: 'none' }

  const tabId = tab.id

  try {
    const exitResults = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'MAIN',
      func: pipTryExitInFrame,
    })
    if (exitResults?.some((r) => r.result === 'exited')) {
      return { action: 'exited' }
    }

    const measureResults = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'MAIN',
      func: pipMeasureInFrame,
    })

    const candidates: VideoCandidate[] = []
    for (const injection of measureResults ?? []) {
      const result = injection.result
      if (result && typeof result === 'object' && result.kind === 'candidate') {
        candidates.push({
          frameId: injection.frameId,
          area: result.area,
          playing: result.playing,
          readyState: result.readyState,
        })
      }
    }

    const best = pickBestVideoCandidate(candidates)
    if (!best) {
      notify('No video found', 'Play a video on this page, then try again.')
      return { action: 'none' }
    }

    const enterResults = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [best.frameId] },
      world: 'MAIN',
      func: pipEnterInFrame,
    })
    const enterResult = enterResults?.[0]?.result
    if (enterResult === 'entered') return { action: 'entered' }
    if (enterResult === 'error') {
      return { action: 'error', gestureRequired: true }
    }
    notify('No video found', 'Could not start Picture-in-Picture on this page.')
    return { action: 'none' }
  } catch (error) {
    logger.warn('toggle pip failed', error)
    const reason = error instanceof Error ? error.message : String(error)
    notify('Picture-in-Picture failed', reason)
    return { action: 'error' }
  }
}

export async function buildPipMenus(): Promise<void> {
  const state = await getPipState()
  if (!state.enabled || !state.showContextMenu) return
  chrome.contextMenus.create({
    id: PIP_MENU_ID,
    title: getChromeMessage('contextMenuPip') || 'Picture-in-Picture',
    contexts: ['video', 'page'],
  })
}

export function isPipMenuItem(menuItemId: string): boolean {
  return menuItemId === PIP_MENU_ID
}

let rebuildContextMenus: (() => Promise<void>) | null = null

export function bindPipMenuRebuild(fn: () => Promise<void>): void {
  rebuildContextMenus = fn
}

async function syncPipFeatureState(): Promise<void> {
  const state = await getPipState()
  await syncPipAutoContentScript(state.enabled && state.autoPip)
  void rebuildContextMenus?.()
}

export function registerPip(): void {
  registerMessageHandler('PIP_TOGGLE', async (message, sender) => {
    let tab: chrome.tabs.Tab | undefined
    const tabId = message.type === 'PIP_TOGGLE' ? message.tabId : undefined
    if (tabId != null) {
      tab = await chrome.tabs.get(tabId)
    } else if (sender.tab?.id != null) {
      tab = sender.tab
    } else {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
      tab = active
    }
    return togglePipInTab(tab)
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.pip) return
    void syncPipFeatureState()
  })

  void syncPipFeatureState()
}

export async function initPipOnStartup(): Promise<void> {
  await syncPipFeatureState()
}
