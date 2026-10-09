import { registerMessageHandler } from '@/core/messaging'

export function registerCaptureHandler() {
  registerMessageHandler('CAPTURE_VISIBLE', async (message) => {
    if (message.type !== 'CAPTURE_VISIBLE') return
    const dataUrl =
      message.windowId === undefined
        ? await chrome.tabs.captureVisibleTab({ format: 'png' })
        : await chrome.tabs.captureVisibleTab(message.windowId, { format: 'png' })
    return { dataUrl }
  })
}
