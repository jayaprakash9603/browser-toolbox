import { registerMessageHandler } from '@/core/messaging'

/** Registers overlay messages without pulling the device catalog into the SW static graph. */
export function registerSimulatorOverlayMessages() {
  registerMessageHandler('SIMULATOR_OPEN_OVERLAY', async (message, sender) => {
    const { handleOpenOverlayMessage } = await import('./overlayService')
    return handleOpenOverlayMessage(message, sender)
  })
  registerMessageHandler('SIMULATOR_OVERLAY_ACTION', async (message, sender) => {
    const { handleOverlayAction } = await import('./overlayService')
    return handleOverlayAction(message, sender)
  })
}
