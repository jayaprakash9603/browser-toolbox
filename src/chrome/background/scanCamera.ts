import { registerMessageHandler } from '@/core/messaging'

import { acquireOffscreen, releaseOffscreen } from './offscreen'

const OWNER = 'pdf-scan-camera'

export function registerScanCameraHandlers(): void {
  registerMessageHandler('SCAN_CAMERA_PREPARE', async () => {
    await acquireOffscreen(OWNER)
    return { ready: true }
  })
  registerMessageHandler('SCAN_CAMERA_RELEASE', async () => {
    await releaseOffscreen(OWNER)
    return { released: true }
  })
}