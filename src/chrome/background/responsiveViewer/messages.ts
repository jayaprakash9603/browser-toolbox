import { registerMessageHandler } from '@/core/messaging'

import { handleOpenOverlayMessage } from './openSimulator'
import { handleOverlayAction } from './overlayService'

export function registerSimulatorOverlayMessages(): void {
  registerMessageHandler('SIMULATOR_OPEN_OVERLAY', handleOpenOverlayMessage)
  registerMessageHandler('SIMULATOR_OVERLAY_ACTION', handleOverlayAction)
}
