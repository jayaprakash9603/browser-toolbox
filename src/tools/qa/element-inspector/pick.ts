import {
  classifyTabUrl,
  ensureContentScriptInTab,
  getActiveBrowserTab,
  TabMessagingError,
} from '@/chrome/contentScriptClient'

export async function startElementPicker(): Promise<void> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) throw new TabMessagingError('NO_TAB')
  const restricted = classifyTabUrl(tab.url)
  if (restricted) throw new TabMessagingError(restricted)
  await ensureContentScriptInTab(tab.id)
  await chrome.tabs.sendMessage(tab.id, { type: 'PICK_ELEMENT_START' })
}

export async function cancelElementPicker(): Promise<void> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PICK_ELEMENT_CANCEL' })
  } catch {
    /* picker was not running on this tab */
  }
}

export async function countCssOnPage(selector: string): Promise<number | null> {
  const tab = await getActiveBrowserTab()
  if (tab?.id == null) return null
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sel: string) => {
        try {
          return document.querySelectorAll(sel).length
        } catch {
          return -1
        }
      },
      args: [selector],
    })
    return typeof injection?.result === 'number' ? injection.result : null
  } catch {
    return null
  }
}

export function downloadText(text: string, name: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 800)
}
