import { STORAGE_KEYS } from '@/core/constants'
import { getReactDevtoolsState } from '@/core/reactDevtools/state'

import { syncReactDevtoolsContentScripts } from './contentScripts'
import { handleReactDevtoolsRuntimeMessage } from './messages'
import { connectReactDevtoolsPort, onReactDevtoolsTabActivated } from './ports'

export async function syncReactDevtoolsState(): Promise<void> {
  const state = await getReactDevtoolsState()
  await syncReactDevtoolsContentScripts(state)
}

export function registerReactDevtools(): void {
  chrome.runtime.onConnect.addListener((port) => connectReactDevtoolsPort(port))

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (typeof message !== 'object' || message === null || !('source' in message)) {
      return false
    }
    return handleReactDevtoolsRuntimeMessage(
      message as { source?: string; payload?: unknown },
      sender,
    )
  })

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    onReactDevtoolsTabActivated(tabId)
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (STORAGE_KEYS.reactDevtools in changes) {
      void syncReactDevtoolsState()
    }
  })
}
