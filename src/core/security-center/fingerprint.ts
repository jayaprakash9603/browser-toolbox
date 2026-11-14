import type { FingerprintClass, FingerprintSignal } from './types'

function signal(
  id: string,
  name: string,
  value: string | null | undefined,
  classification: FingerprintClass,
  explanation: string,
  recommendation?: string,
): FingerprintSignal {
  if (value == null || value === '') {
    return {
      id,
      name,
      value: 'Unavailable',
      classification: 'unavailable',
      explanation,
      recommendation,
    }
  }
  return { id, name, value, classification, explanation, recommendation }
}

export function collectLocalFingerprint(source: {
  userAgent?: string
  platform?: string
  languages?: readonly string[]
  timeZone?: string
  screenWidth?: number
  screenHeight?: number
  devicePixelRatio?: number
  hardwareConcurrency?: number
  maxTouchPoints?: number
  colorDepth?: number
  webglVendor?: string | null
  webglRenderer?: string | null
  canvasProbe?: string | null
  audioAvailable?: boolean | null
  webrtcAvailable?: boolean | null
}): FingerprintSignal[] {
  const languages = source.languages?.join(', ')
  const screen =
    source.screenWidth && source.screenHeight
      ? `${source.screenWidth}×${source.screenHeight}`
      : null
  return [
    signal(
      'ua',
      'User agent',
      source.userAgent,
      'potentially_identifying',
      'The user-agent string is shared with every website and often includes browser and OS details.',
      'Prefer a current browser; do not assume UA spoofing is harmless.',
    ),
    signal('platform', 'Platform', source.platform, 'common', 'OS family reported by the browser.'),
    signal(
      'languages',
      'Languages',
      languages,
      'potentially_identifying',
      'Language lists are relatively identifying when combined with other signals.',
    ),
    signal('timezone', 'Time zone', source.timeZone, 'potentially_identifying', 'Time zone often reveals a region.'),
    signal('screen', 'Screen size', screen, 'common', 'Screen bounds are shared by many devices of the same class.'),
    signal(
      'dpr',
      'Device pixel ratio',
      source.devicePixelRatio != null ? String(source.devicePixelRatio) : null,
      'common',
      'DPR is typically 1, 2, or 3.',
    ),
    signal(
      'cores',
      'Hardware concurrency',
      source.hardwareConcurrency != null ? String(source.hardwareConcurrency) : null,
      'potentially_identifying',
      'CPU thread count varies across devices and can contribute to a fingerprint.',
    ),
    signal(
      'touch',
      'Touch points',
      source.maxTouchPoints != null ? String(source.maxTouchPoints) : null,
      'common',
      'Reports whether a touch screen is present.',
    ),
    signal(
      'color',
      'Color depth',
      source.colorDepth != null ? String(source.colorDepth) : null,
      'common',
      'Most desktops report 24-bit color.',
    ),
    signal(
      'webgl',
      'WebGL',
      source.webglVendor || source.webglRenderer
        ? `${source.webglVendor ?? ''} ${source.webglRenderer ?? ''}`.trim()
        : null,
      source.webglRenderer ? 'potentially_identifying' : 'unavailable',
      'GPU renderer strings can be identifying. This is a local observation, not a uniqueness score.',
    ),
    signal(
      'canvas',
      'Canvas probe',
      source.canvasProbe,
      source.canvasProbe ? 'potentially_identifying' : 'not_tested',
      'Canvas output can differ slightly between GPUs. No global uniqueness is claimed.',
    ),
    signal(
      'audio',
      'Audio API',
      source.audioAvailable == null ? null : source.audioAvailable ? 'Available' : 'Unavailable',
      'common',
      'Whether AudioContext exists in this document.',
    ),
    signal(
      'webrtc',
      'WebRTC',
      source.webrtcAvailable == null ? null : source.webrtcAvailable ? 'RTCPeerConnection present' : 'Unavailable',
      'potentially_identifying',
      'WebRTC can expose local network details to pages that request it. This check only looks for API availability.',
    ),
  ]
}

/** Serializable world function for chrome.scripting.executeScript. */
export function collectPageFingerprintWorld(): {
  userAgent?: string
  platform?: string
  languages?: string[]
  timeZone?: string
  screenWidth?: number
  screenHeight?: number
  devicePixelRatio?: number
  hardwareConcurrency?: number
  maxTouchPoints?: number
  colorDepth?: number
} {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    languages: [...navigator.languages],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: screen.width,
    screenHeight: screen.height,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    colorDepth: screen.colorDepth,
  }
}

export function collectPanelFingerprint(): FingerprintSignal[] {
  let webglVendor: string | null = null
  let webglRenderer: string | null = null
  let canvasProbe: string | null = null
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      if (ext) {
        webglVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string
        webglRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
      }
    }
    const two = canvas.getContext('2d')
    if (two) {
      two.textBaseline = 'top'
      two.font = '14px sans-serif'
      two.fillText('One Panel', 2, 2)
      canvasProbe = canvas.toDataURL().slice(0, 48)
    }
  } catch {
    /* APIs may be blocked */
  }
  return collectLocalFingerprint({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    languages: navigator.languages,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    colorDepth: window.screen.colorDepth,
    webglVendor,
    webglRenderer,
    canvasProbe,
    audioAvailable: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
    webrtcAvailable: typeof RTCPeerConnection !== 'undefined',
  })
}

declare const webkitAudioContext: unknown
