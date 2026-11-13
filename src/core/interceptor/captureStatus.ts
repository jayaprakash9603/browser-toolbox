import type { CaptureStatus } from './apiFinderTypes'

export function resolveCaptureStatus(input: {
  webRequestGranted: boolean | null
  capturePaused: boolean
  source?: 'webRequest' | 'devtools'
  error?: string | null
}): CaptureStatus {
  if (input.error) return 'error'
  if (input.source === 'devtools') return input.capturePaused ? 'paused' : 'capturing'
  if (input.webRequestGranted === false) return 'permissionRequired'
  if (input.webRequestGranted == null) return 'unsupported'
  if (input.capturePaused) return 'paused'
  return 'capturing'
}
