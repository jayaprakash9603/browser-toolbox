import { broadcastToTabFrames } from '@/chrome/contentScriptClient'
import { registerMessageHandler } from '@/core/messaging'

export function registerInspectorFrameFocus(): void {
  registerMessageHandler('INSPECTOR_POINTER_ACTIVE', async (_message, sender) => {
    const frameId = sender.frameId ?? 0
    const tabId = sender.tab?.id
    if (tabId != null) {
      await broadcastToTabFrames(tabId, { type: 'INSPECTOR_FRAME_FOCUS', frameId })
    }
    return { frameId }
  })
}
