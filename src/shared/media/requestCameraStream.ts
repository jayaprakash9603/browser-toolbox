const CAMERA_ATTEMPTS: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  },
  { audio: false, video: { facingMode: { ideal: 'environment' } } },
  { audio: false, video: { facingMode: { ideal: 'user' } } },
  { audio: false, video: true },
]

export type CameraAccessError = 'unsupported' | 'denied' | 'unavailable'

export function classifyCameraError(cause: unknown): CameraAccessError {
  if (!(cause instanceof DOMException)) return 'unavailable'
  if (cause.name === 'NotAllowedError' || cause.name === 'SecurityError' || cause.name === 'PermissionDismissedError') {
    return 'denied'
  }
  return 'unavailable'
}

/** Tries relaxed constraints so desktop webcams work without a rear-facing camera. */
export async function requestCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera is not supported in this context.', 'NotSupportedError')
  }
  let last: unknown
  for (const constraints of CAMERA_ATTEMPTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (cause) {
      last = cause
      if (classifyCameraError(cause) === 'denied') throw cause
    }
  }
  throw last instanceof Error ? last : new DOMException('No camera is available.', 'NotFoundError')
}

export async function attachCameraPreview(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  video.srcObject = stream
  try {
    await video.play()
  } catch {
    // Autoplay may still show frames on some browsers after user gesture.
  }
}