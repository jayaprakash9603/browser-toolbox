/** Photoreal bezels from open-device-frame (MIT). Insets are fractions of the image. */

import { CATALOG_MOCKUPS } from './catalog-mockups.generated'

export interface MockupInsets {
  left: number
  top: number
  right: number
  bottom: number
}

export type MockupSource = 'mit'

export interface DeviceMockup extends MockupInsets {
  file: string
  source: MockupSource
}

const MIT_FRAMES: Record<string, MockupInsets> = {
  'iphone-14.webp': { left: 0.07362, top: 0.030534, right: 0.079755, bottom: 0.041221 },
  'iphone-15.webp': { left: 0.072727, top: 0.029895, right: 0.078788, bottom: 0.037369 },
  'iphone-15-plus.webp': { left: 0.066116, top: 0.027027, right: 0.085399, bottom: 0.048649 },
  'iphone-15-pro.webp': { left: 0.072289, top: 0.029412, right: 0.072289, bottom: 0.041176 },
  'iphone-15-pro-max.webp': { left: 0.064, top: 0.02642, right: 0.072, bottom: 0.038309 },
  'iphone-16.webp': { left: 0.072508, top: 0.029542, right: 0.081571, bottom: 0.031019 },
  'iphone-16-plus.webp': { left: 0.054348, top: 0.026991, right: 0.065217, bottom: 0.033738 },
  'iphone-16-pro.webp': { left: 0.071217, top: 0.029542, right: 0.074184, bottom: 0.031019 },
  'iphone-16-pro-max.webp': { left: 0.054054, top: 0.02656, right: 0.07027, bottom: 0.033201 },
  'pixel-8.webp': { left: 0.060377, top: 0.034722, right: 0.079245, bottom: 0.055556 },
  'pixel-8-pro.webp': { left: 0.078689, top: 0.03125, right: 0.081967, bottom: 0.05 },
  'pixel-9.webp': { left: 0.069444, top: 0.039409, right: 0.083333, bottom: 0.041051 },
  'pixel-9-pro.webp': { left: 0.066667, top: 0.0384, right: 0.08, bottom: 0.04 },
  'pixel-9-pro-xl.webp': { left: 0.050157, top: 0.029895, right: 0.0721, bottom: 0.037369 },
  'xiaomi-15-ultra.webp': { left: 0.059172, top: 0.023022, right: 0.065089, bottom: 0.038849 },
}

/** Catalog id → closest published MIT frame. Galaxy S / SE / tablets keep the CSS chassis. */
export const DEVICE_FILE: Record<string, keyof typeof MIT_FRAMES> = {
  'iphone-16-pro': 'iphone-16-pro.webp',
  'iphone-16-pro-max': 'iphone-16-pro-max.webp',
  'iphone-16': 'iphone-16.webp',
  'iphone-17-pro': 'iphone-16-pro.webp',
  'iphone-17-pro-max': 'iphone-16-pro-max.webp',
  'iphone-17': 'iphone-16.webp',
  'iphone-air': 'iphone-16-plus.webp',
  'iphone-pro-max': 'iphone-15-pro-max.webp',
  iphone: 'iphone-15.webp',
  'iphone-15-pro': 'iphone-15-pro.webp',
  'iphone-14-pro': 'iphone-15-pro.webp',
  'iphone-14': 'iphone-14.webp',
  'iphone-13': 'iphone-14.webp',
  'iphone-12': 'iphone-14.webp',
  'iphone-11': 'iphone-14.webp',
  'pixel-10-pro': 'pixel-9-pro-xl.webp',
  'pixel-10': 'pixel-9.webp',
  'pixel-9-pro': 'pixel-9-pro.webp',
  'pixel-9': 'pixel-9.webp',
  'pixel-8-pro': 'pixel-8-pro.webp',
  pixel: 'pixel-8.webp',
  'xiaomi-14': 'xiaomi-15-ultra.webp',
}

export const MOCKUP_PUBLIC_DIR = 'simulator/frames'

function publicAssetUrl(file: string): string {
  const path = `${MOCKUP_PUBLIC_DIR}/${file}`
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL(path)
  } catch {
    /* tests / non-extension */
  }
  return `/${path}`
}

export function mockupFor(deviceId: string): DeviceMockup | null {
  const row = CATALOG_MOCKUPS[deviceId]
  if (row) {
    const [file, left, top, right, bottom] = row
    return { file, left, top, right, bottom, source: 'mit' }
  }
  const file = DEVICE_FILE[deviceId]
  if (!file) return null
  const insets = MIT_FRAMES[file]
  if (!insets) return null
  return { file, ...insets, source: 'mit' }
}

export function mockupSrc(mockup: DeviceMockup): string
export function mockupSrc(file: string): string
export function mockupSrc(mockupOrFile: DeviceMockup | string): string {
  const file = typeof mockupOrFile === 'string' ? mockupOrFile : mockupOrFile.file
  return publicAssetUrl(file)
}

/** Small preview in the device picker (same MIT frame, scaled in CSS). */
export function mockupThumbUrl(deviceId: string): string | undefined {
  const mockup = mockupFor(deviceId)
  return mockup ? publicAssetUrl(mockup.file) : undefined
}

/** 90° clockwise: portrait image laid on a landscape outer box. */
export function orientedMockupInsets(insets: MockupInsets, rotated: boolean): MockupInsets {
  if (!rotated) return insets
  return { left: insets.bottom, top: insets.left, right: insets.top, bottom: insets.right }
}

export function mockupOuterSize(screen: { width: number; height: number }, insets: MockupInsets) {
  const holeW = 1 - insets.left - insets.right
  const holeH = 1 - insets.top - insets.bottom
  return {
    width: screen.width / holeW,
    height: screen.height / holeH,
  }
}