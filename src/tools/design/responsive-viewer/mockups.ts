/** Photoreal phone bezels (760px WebPs). Insets are fractions of the image. */

import { MOCKUP_FRAMES } from './mockup-frames.generated'

export interface MockupInsets {
  left: number
  top: number
  right: number
  bottom: number
}

export interface DeviceMockup extends MockupInsets {
  file: string
}

const FRAMES = MOCKUP_FRAMES

/** Catalog id → frame file in public/simulator/frames. */
const DEVICE_FILE: Record<string, keyof typeof FRAMES> = {
  'iphone-17-pro-max': 'iphone-17-pro-max.webp',
  'iphone-17-pro': 'iphone-17-pro.webp',
  'iphone-17': 'iphone-17.webp',
  'iphone-air': 'iphone-air.webp',
  'iphone-16-pro-max': 'iphone-16-pro-max.webp',
  'iphone-16-pro': 'iphone-16-pro.webp',
  'iphone-16': 'iphone-16.webp',
  'iphone-pro-max': 'iphone-pro-max.webp',
  iphone: 'iphone.webp',
  'iphone-15-pro': 'iphone-15-pro.webp',
  'iphone-14-pro': 'iphone-14-pro.webp',
  'iphone-14': 'iphone-14.webp',
  'iphone-13': 'iphone-13.webp',
  'iphone-12': 'iphone-12.webp',
  'iphone-11': 'iphone-11.webp',
  'iphone-se': 'iphone-se.webp',

  'galaxy-s26-ultra': 'galaxy-s26-ultra.webp',
  'galaxy-s26-plus': 'galaxy-s26-ultra.webp',
  'galaxy-s26': 'galaxy-s24.webp',
  'galaxy-s25-ultra': 'galaxy-s24-ultra.webp',
  'galaxy-s25-plus': 'galaxy-s24-ultra.webp',
  'galaxy-s25': 'galaxy-s24.webp',
  'galaxy-s24-ultra': 'galaxy-s24-ultra.webp',
  galaxy: 'galaxy-s24.webp',
  'galaxy-s23': 'galaxy-s23.webp',
  'galaxy-z-fold': 'galaxy-z-fold.webp',
  'galaxy-z-flip': 'galaxy-z-flip.webp',

  'pixel-10-pro': 'pixel-10-pro.webp',
  'pixel-10': 'pixel-10.webp',
  'pixel-9-pro': 'pixel-9-pro.webp',
  'pixel-9': 'pixel-9.webp',
  'pixel-8-pro': 'pixel-8-pro.webp',
  pixel: 'pixel-8.webp',

  'oneplus-13': 'oneplus-13.webp',
  'xiaomi-14': 'xiaomi-14.webp',
  'oppo-find-x8': 'oppo-find-x8.webp',
  'vivo-x200': 'vivo-x200.webp',
  'motorola-edge': 'motorola-edge.webp',
  'nothing-phone': 'nothing-phone.webp',
}

export const MOCKUP_PUBLIC_DIR = 'simulator/frames'

export function mockupFor(deviceId: string): DeviceMockup | null {
  const file = DEVICE_FILE[deviceId]
  if (!file) return null
  const insets = FRAMES[file]
  if (!insets) return null
  return { file, ...insets }
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

export function mockupSrc(file: string): string {
  const path = `${MOCKUP_PUBLIC_DIR}/${file}`
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL(path)
  } catch {
    /* tests / non-extension */
  }
  return `/${path}`
}