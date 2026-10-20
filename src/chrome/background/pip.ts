import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { createLogger } from '@/core/logging'
import { registerMessageHandler } from '@/core/messaging'
import {
  DEFAULT_PIP_STATE,
  PIP_MENU_ID,
  getPipState,
  pickBestVideoCandidate,
  type PipState,
  type PipToggleResult,
  type VideoCandidate,
} from '@/core/pip'
import {
  pipEnterDocumentInFrame,
  pipEnterEmbeddedInTopFrame,
  pipEnterInFrame,
  pipEnterStreamingInFrame,
  pipMeasureInFrame,
  pipSetAutoActiveInFrame,
  pipShutdownInFrame,
  pipTryExitInFrame,
} from '@/core/pip/pageScripts'

import { PIP_AUTO_JS, syncPipAutoContentScript } from './pipContentScripts'

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

    // Video in the page itself: float the whole player (site controls included) in a
    // Document PiP window. Falls back to native video PiP when that isn't possible.
    if (best.frameId === 0) {
      const docResult = await chrome.scripting
        .executeScript({ target: { tabId, frameIds: [0] }, world: 'MAIN', func: pipEnterDocumentInFrame })
        .then((r) => r?.[0]?.result)
        .catch(() => undefined)
      if (docResult === 'entered') return { action: 'entered' }
      if (docResult === 'drm') {
        const streamResult = await chrome.scripting
          .executeScript({ target: { tabId, frameIds: [0] }, world: 'MAIN', func: pipEnterStreamingInFrame })
          .then((r) => r?.[0]?.result)
          .catch(() => undefined)
        if (streamResult === 'entered') return { action: 'entered' }
      }
    } else {
      // Player embedded from another site: open a full copy of it in a Document PiP window.
      const embedResult = await chrome.scripting
        .executeScript({ target: { tabId, frameIds: [0] }, world: 'MAIN', func: pipEnterEmbeddedInTopFrame })
        .then((r) => r?.[0]?.result)
        .catch(() => undefined)
      if (embedResult === 'entered') return { action: 'entered' }
    }

    const enterResults = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [best.frameId] },
      world: 'MAIN',
      func: pipEnterInFrame,
    })
    const enterResult = enterResults?.[0]?.result
    if (enterResult === 'entered') return { action: 'entered' }
    if (enterResult === 'error') {
      if (best.frameId !== 0) {
        notify(
          'Use the PiP button on the video',
          'This player is embedded from another site, so Chrome blocks the shortcut. Hover the video and click the Picture-in-Picture button in its top-left corner.',
        )
      }
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

async function scriptableTabIds(): Promise<number[]> {
  const tabs = await chrome.tabs.query({})
  return tabs
    .filter((tab) => tab.id != null && !tab.discarded && /^(https?|file):/.test(tab.url ?? ''))
    .map((tab) => tab.id as number)
}

/** Registered content scripts only reach new page loads; apply the switch to open tabs too. */
async function applyPipStateToOpenTabs(prev: PipState, next: PipState): Promise<void> {
  const autoWas = prev.enabled && prev.autoPip
  const autoIs = next.enabled && next.autoPip
  const shutdown = prev.enabled && !next.enabled
  if (!shutdown && autoWas === autoIs) return

  for (const tabId of await scriptableTabIds()) {
    const target = { tabId, allFrames: true }
    if (shutdown) {
      void chrome.scripting
        .executeScript({ target, world: 'MAIN', func: pipShutdownInFrame })
        .catch(() => undefined)
      continue
    }
    void chrome.scripting
      .executeScript({ target, world: 'MAIN', func: pipSetAutoActiveInFrame, args: [autoIs] })
      .then(() =>
        autoIs ? chrome.scripting.executeScript({ target, world: 'MAIN', files: [PIP_AUTO_JS] }) : undefined,
      )
      .catch(() => undefined)
  }
}

function toPipState(value: unknown): PipState {
  const raw = (value ?? {}) as Partial<PipState>
  return {
    enabled: raw.enabled ?? DEFAULT_PIP_STATE.enabled,
    autoPip: raw.autoPip ?? DEFAULT_PIP_STATE.autoPip,
    showContextMenu: raw.showContextMenu ?? DEFAULT_PIP_STATE.showContextMenu,
  }
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
    void applyPipStateToOpenTabs(toPipState(changes.pip.oldValue), toPipState(changes.pip.newValue))
    void syncPipFeatureState()
  })

  void syncPipFeatureState()
}

export async function initPipOnStartup(): Promise<void> {
  await syncPipFeatureState()
}
