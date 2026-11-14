import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

/** Picks the page that should see the countdown and recording pill (not the side panel). */
export async function resolveRecorderTargetTab(hint?: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined> {
  if (hint?.id != null && hint.url && !isRestrictedCaptureUrl(hint.url)) return hint

  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (focused?.id != null && focused.url && !isRestrictedCaptureUrl(focused.url)) return focused

  if (focused?.windowId != null) {
    const inWindow = await chrome.tabs.query({ windowId: focused.windowId })
    const eligible = inWindow.filter((tab) => tab.id != null && tab.url && !isRestrictedCaptureUrl(tab.url))
    if (eligible.length) {
      return eligible.find((tab) => tab.highlighted) ?? eligible[eligible.length - 1]
    }
  }

  const [httpTab] = await chrome.tabs.query({ active: true, url: ['http://*/*', 'https://*/*'] })
  return httpTab
}