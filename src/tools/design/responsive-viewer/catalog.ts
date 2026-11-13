import type { Device, DeviceKind, FrameColor, FrameStyle, NotchStyle, SpecStatus } from './devices'

const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
const UA_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const UA_ANDROID_TAB =
  'Mozilla/5.0 (Linux; Android 15; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const UA_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15'
const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

interface Spec {
  id: string
  label: string
  kind: DeviceKind
  width: number
  height: number
  manufacturer: string
  model: string
  dpr: number
  specStatus: SpecStatus
  frameStyle: FrameStyle
  notch?: NotchStyle
  statusBar?: Device['statusBar']
  navBar?: Device['navBar']
  touch?: boolean
  userAgent?: string
  safeArea?: Device['safeArea']
  folded?: { width: number; height: number }
  unfolded?: { width: number; height: number }
  frameColor?: FrameColor
}

function item(spec: Spec): Device {
  const handheld = spec.kind === 'phone' || spec.kind === 'tablet' || spec.kind === 'watch'
  return {
    id: spec.id,
    label: spec.label,
    kind: spec.kind,
    width: spec.width,
    height: spec.height,
    manufacturer: spec.manufacturer,
    model: spec.model,
    dpr: spec.dpr,
    touch: spec.touch ?? handheld,
    userAgent: spec.userAgent,
    frameStyle: spec.frameStyle,
    notch: spec.notch ?? 'none',
    safeArea: spec.safeArea,
    statusBar: spec.statusBar ?? (spec.kind === 'phone' || spec.kind === 'tablet' ? (spec.frameStyle === 'iphone' || spec.frameStyle === 'tablet-ios' ? 'ios' : 'android') : 'none'),
    navBar: spec.navBar ?? (spec.kind === 'phone' ? (spec.frameStyle === 'iphone' ? 'home-indicator' : 'android') : 'none'),
    specStatus: spec.specStatus,
    folded: spec.folded,
    unfolded: spec.unfolded,
    frameColor: spec.frameColor,
  }
}

const IOS_SAFE = { top: 54, right: 0, bottom: 34, left: 0 }
const IOS_SE_SAFE = { top: 20, right: 0, bottom: 0, left: 0 }
const ANDROID_SAFE = { top: 28, right: 0, bottom: 48, left: 0 }
const IPAD_SAFE = { top: 24, right: 0, bottom: 20, left: 0 }

/** Built-in CSS viewports. Existing ids stay stable so saved settings keep resolving. */
export const DEVICES: readonly Device[] = [
  item({ id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', kind: 'phone', width: 440, height: 956, manufacturer: 'Apple', model: 'iPhone 17 Pro Max', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: { top: 62, right: 0, bottom: 34, left: 0 }, frameColor: 'titanium' }),
  item({ id: 'iphone-17-pro', label: 'iPhone 17 Pro', kind: 'phone', width: 402, height: 874, manufacturer: 'Apple', model: 'iPhone 17 Pro', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE, frameColor: 'titanium' }),
  item({ id: 'iphone-17', label: 'iPhone 17', kind: 'phone', width: 402, height: 874, manufacturer: 'Apple', model: 'iPhone 17', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE }),
  item({ id: 'iphone-air', label: 'iPhone Air', kind: 'phone', width: 420, height: 912, manufacturer: 'Apple', model: 'iPhone Air', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE, frameColor: 'silver' }),
  item({ id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max', kind: 'phone', width: 440, height: 956, manufacturer: 'Apple', model: 'iPhone 16 Pro Max', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: { top: 62, right: 0, bottom: 34, left: 0 }, frameColor: 'titanium' }),
  item({ id: 'iphone-16-pro', label: 'iPhone 16 Pro', kind: 'phone', width: 402, height: 874, manufacturer: 'Apple', model: 'iPhone 16 Pro', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE, frameColor: 'titanium' }),
  item({ id: 'iphone-16', label: 'iPhone 16', kind: 'phone', width: 393, height: 852, manufacturer: 'Apple', model: 'iPhone 16', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE }),
  item({ id: 'iphone-pro-max', label: 'iPhone 15 Pro Max', kind: 'phone', width: 430, height: 932, manufacturer: 'Apple', model: 'iPhone 15 Pro Max', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE, frameColor: 'titanium' }),
  item({ id: 'iphone', label: 'iPhone 15', kind: 'phone', width: 393, height: 852, manufacturer: 'Apple', model: 'iPhone 15', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE }),
  item({ id: 'iphone-15-pro', label: 'iPhone 15 Pro', kind: 'phone', width: 393, height: 852, manufacturer: 'Apple', model: 'iPhone 15 Pro', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE, frameColor: 'titanium' }),
  item({ id: 'iphone-14-pro', label: 'iPhone 14 Pro', kind: 'phone', width: 393, height: 852, manufacturer: 'Apple', model: 'iPhone 14 Pro', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'island', userAgent: UA_IOS, safeArea: IOS_SAFE }),
  item({ id: 'iphone-14', label: 'iPhone 14', kind: 'phone', width: 390, height: 844, manufacturer: 'Apple', model: 'iPhone 14', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'notch', userAgent: UA_IOS, safeArea: { top: 47, right: 0, bottom: 34, left: 0 } }),
  item({ id: 'iphone-13', label: 'iPhone 13', kind: 'phone', width: 390, height: 844, manufacturer: 'Apple', model: 'iPhone 13', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'notch', userAgent: UA_IOS, safeArea: { top: 47, right: 0, bottom: 34, left: 0 } }),
  item({ id: 'iphone-12', label: 'iPhone 12', kind: 'phone', width: 390, height: 844, manufacturer: 'Apple', model: 'iPhone 12', dpr: 3, specStatus: 'verified', frameStyle: 'iphone', notch: 'notch', userAgent: UA_IOS, safeArea: { top: 47, right: 0, bottom: 34, left: 0 } }),
  item({ id: 'iphone-11', label: 'iPhone 11', kind: 'phone', width: 414, height: 896, manufacturer: 'Apple', model: 'iPhone 11', dpr: 2, specStatus: 'verified', frameStyle: 'iphone', notch: 'notch', userAgent: UA_IOS, safeArea: { top: 48, right: 0, bottom: 34, left: 0 } }),
  item({ id: 'iphone-se', label: 'iPhone SE', kind: 'phone', width: 375, height: 667, manufacturer: 'Apple', model: 'iPhone SE (3rd generation)', dpr: 2, specStatus: 'verified', frameStyle: 'iphone-home', notch: 'none', userAgent: UA_IOS, safeArea: IOS_SE_SAFE, navBar: 'none', statusBar: 'ios' }),

  item({ id: 'galaxy-s26-ultra', label: 'Galaxy S26 Ultra', kind: 'phone', width: 384, height: 832, manufacturer: 'Samsung', model: 'Galaxy S26 Ultra', dpr: 3, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE, frameColor: 'black' }),
  item({ id: 'galaxy-s26-plus', label: 'Galaxy S26+', kind: 'phone', width: 384, height: 832, manufacturer: 'Samsung', model: 'Galaxy S26+', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'galaxy-s26', label: 'Galaxy S26', kind: 'phone', width: 360, height: 780, manufacturer: 'Samsung', model: 'Galaxy S26', dpr: 3, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'galaxy-s25-ultra', label: 'Galaxy S25 Ultra', kind: 'phone', width: 384, height: 832, manufacturer: 'Samsung', model: 'Galaxy S25 Ultra', dpr: 3, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'galaxy-s25-plus', label: 'Galaxy S25+', kind: 'phone', width: 384, height: 832, manufacturer: 'Samsung', model: 'Galaxy S25+', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'galaxy-s25', label: 'Galaxy S25', kind: 'phone', width: 360, height: 780, manufacturer: 'Samsung', model: 'Galaxy S25', dpr: 3, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'galaxy-s24-ultra', label: 'Galaxy S24 Ultra', kind: 'phone', width: 384, height: 832, manufacturer: 'Samsung', model: 'Galaxy S24 Ultra', dpr: 3, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE, frameColor: 'graphite' }),
  item({ id: 'galaxy', label: 'Galaxy S24', kind: 'phone', width: 360, height: 780, manufacturer: 'Samsung', model: 'Galaxy S24', dpr: 3, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'galaxy-s23', label: 'Galaxy S23', kind: 'phone', width: 360, height: 780, manufacturer: 'Samsung', model: 'Galaxy S23', dpr: 3, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({
    id: 'galaxy-z-fold',
    label: 'Galaxy Z Fold',
    kind: 'phone',
    width: 690,
    height: 829,
    manufacturer: 'Samsung',
    model: 'Galaxy Z Fold',
    dpr: 2.4,
    specStatus: 'approximate',
    frameStyle: 'fold',
    notch: 'punch-hole',
    userAgent: UA_ANDROID,
    safeArea: ANDROID_SAFE,
    folded: { width: 344, height: 882 },
    unfolded: { width: 690, height: 829 },
  }),
  item({
    id: 'galaxy-z-flip',
    label: 'Galaxy Z Flip',
    kind: 'phone',
    width: 360,
    height: 748,
    manufacturer: 'Samsung',
    model: 'Galaxy Z Flip',
    dpr: 3,
    specStatus: 'approximate',
    frameStyle: 'flip',
    notch: 'punch-hole',
    userAgent: UA_ANDROID,
    safeArea: ANDROID_SAFE,
    folded: { width: 252, height: 314 },
    unfolded: { width: 360, height: 748 },
  }),

  item({ id: 'pixel-10-pro', label: 'Pixel 10 Pro', kind: 'phone', width: 412, height: 915, manufacturer: 'Google', model: 'Pixel 10 Pro', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'pixel-10', label: 'Pixel 10', kind: 'phone', width: 412, height: 915, manufacturer: 'Google', model: 'Pixel 10', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'pixel-9-pro', label: 'Pixel 9 Pro', kind: 'phone', width: 412, height: 915, manufacturer: 'Google', model: 'Pixel 9 Pro', dpr: 2.625, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'pixel-9', label: 'Pixel 9', kind: 'phone', width: 412, height: 924, manufacturer: 'Google', model: 'Pixel 9', dpr: 2.625, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'pixel-8-pro', label: 'Pixel 8 Pro', kind: 'phone', width: 412, height: 892, manufacturer: 'Google', model: 'Pixel 8 Pro', dpr: 2.625, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'pixel', label: 'Pixel 8', kind: 'phone', width: 412, height: 915, manufacturer: 'Google', model: 'Pixel 8', dpr: 2.625, specStatus: 'verified', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),

  item({ id: 'oneplus-13', label: 'OnePlus 13', kind: 'phone', width: 412, height: 915, manufacturer: 'OnePlus', model: 'OnePlus 13', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'xiaomi-14', label: 'Xiaomi 14', kind: 'phone', width: 392, height: 873, manufacturer: 'Xiaomi', model: 'Xiaomi 14', dpr: 2.75, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'oppo-find-x8', label: 'OPPO Find X8', kind: 'phone', width: 412, height: 915, manufacturer: 'OPPO', model: 'Find X8', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'vivo-x200', label: 'vivo X200', kind: 'phone', width: 412, height: 915, manufacturer: 'vivo', model: 'X200', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'motorola-edge', label: 'Motorola Edge', kind: 'phone', width: 412, height: 915, manufacturer: 'Motorola', model: 'Edge', dpr: 2.5, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE }),
  item({ id: 'nothing-phone', label: 'Nothing Phone', kind: 'phone', width: 412, height: 915, manufacturer: 'Nothing', model: 'Phone (2)', dpr: 2.625, specStatus: 'approximate', frameStyle: 'android', notch: 'punch-hole', userAgent: UA_ANDROID, safeArea: ANDROID_SAFE, frameColor: 'white' }),

  item({ id: 'ipad-pro-13', label: 'iPad Pro 13-inch', kind: 'tablet', width: 1032, height: 1376, manufacturer: 'Apple', model: 'iPad Pro 13-inch', dpr: 2, specStatus: 'verified', frameStyle: 'tablet-ios', notch: 'none', userAgent: UA_IPAD, safeArea: IPAD_SAFE, frameColor: 'silver' }),
  item({ id: 'ipad', label: 'iPad Pro 12.9"', kind: 'tablet', width: 1024, height: 1366, manufacturer: 'Apple', model: 'iPad Pro 12.9-inch', dpr: 2, specStatus: 'verified', frameStyle: 'tablet-ios', notch: 'none', userAgent: UA_IPAD, safeArea: IPAD_SAFE }),
  item({ id: 'ipad-pro-11', label: 'iPad Pro 11-inch', kind: 'tablet', width: 834, height: 1194, manufacturer: 'Apple', model: 'iPad Pro 11-inch', dpr: 2, specStatus: 'verified', frameStyle: 'tablet-ios', notch: 'none', userAgent: UA_IPAD, safeArea: IPAD_SAFE }),
  item({ id: 'ipad-air', label: 'iPad Air', kind: 'tablet', width: 820, height: 1180, manufacturer: 'Apple', model: 'iPad Air', dpr: 2, specStatus: 'verified', frameStyle: 'tablet-ios', notch: 'none', userAgent: UA_IPAD, safeArea: IPAD_SAFE }),
  item({ id: 'ipad-mini', label: 'iPad Mini', kind: 'tablet', width: 768, height: 1024, manufacturer: 'Apple', model: 'iPad mini', dpr: 2, specStatus: 'verified', frameStyle: 'tablet-ios', notch: 'none', userAgent: UA_IPAD, safeArea: IPAD_SAFE }),
  item({ id: 'galaxy-tab', label: 'Galaxy Tab', kind: 'tablet', width: 800, height: 1280, manufacturer: 'Samsung', model: 'Galaxy Tab S9', dpr: 2, specStatus: 'approximate', frameStyle: 'tablet-android', notch: 'none', userAgent: UA_ANDROID_TAB, safeArea: { top: 24, right: 0, bottom: 24, left: 0 } }),
  item({ id: 'android-tablet', label: 'Android Tablet', kind: 'tablet', width: 800, height: 1280, manufacturer: 'Generic', model: 'Android Tablet', dpr: 2, specStatus: 'approximate', frameStyle: 'tablet-android', notch: 'none', userAgent: UA_ANDROID_TAB }),
  item({ id: 'surface', label: 'Surface Pro 7', kind: 'tablet', width: 912, height: 1368, manufacturer: 'Microsoft', model: 'Surface Pro 7', dpr: 2, specStatus: 'verified', frameStyle: 'tablet-android', notch: 'none', userAgent: UA_DESKTOP, touch: true }),
  item({ id: 'generic-tablet', label: 'Generic Tablet', kind: 'tablet', width: 768, height: 1024, manufacturer: 'Generic', model: 'Tablet', dpr: 2, specStatus: 'approximate', frameStyle: 'tablet-android', notch: 'none' }),

  item({ id: 'macbook-air', label: 'MacBook Air 13"', kind: 'laptop', width: 1470, height: 956, manufacturer: 'Apple', model: 'MacBook Air 13-inch', dpr: 2, specStatus: 'verified', frameStyle: 'laptop', userAgent: UA_MAC, touch: false, frameColor: 'silver' }),
  item({ id: 'macbook-pro', label: 'MacBook Pro', kind: 'laptop', width: 1512, height: 982, manufacturer: 'Apple', model: 'MacBook Pro 14-inch', dpr: 2, specStatus: 'verified', frameStyle: 'laptop', userAgent: UA_MAC, touch: false, frameColor: 'graphite' }),
  item({ id: 'laptop', label: 'Laptop 13"', kind: 'laptop', width: 1280, height: 800, manufacturer: 'Generic', model: 'Laptop 13-inch', dpr: 1, specStatus: 'verified', frameStyle: 'laptop', userAgent: UA_DESKTOP, touch: false }),
  item({ id: 'laptop-hd', label: 'Laptop HD', kind: 'laptop', width: 1366, height: 768, manufacturer: 'Generic', model: 'Laptop HD', dpr: 1, specStatus: 'verified', frameStyle: 'laptop', userAgent: UA_DESKTOP, touch: false }),
  item({ id: 'imac', label: 'iMac', kind: 'desktop', width: 1920, height: 1080, manufacturer: 'Apple', model: 'iMac', dpr: 2, specStatus: 'approximate', frameStyle: 'desktop', userAgent: UA_MAC, touch: false, frameColor: 'silver' }),
  item({ id: 'desktop', label: 'Desktop HD', kind: 'desktop', width: 1920, height: 1080, manufacturer: 'Generic', model: 'HD Desktop', dpr: 1, specStatus: 'verified', frameStyle: 'desktop', userAgent: UA_DESKTOP, touch: false }),
  item({ id: 'desktop-2k', label: 'Desktop 2K', kind: 'desktop', width: 2560, height: 1440, manufacturer: 'Generic', model: '2K Desktop', dpr: 1, specStatus: 'verified', frameStyle: 'desktop', userAgent: UA_DESKTOP, touch: false }),
  item({ id: 'desktop-full-hd', label: 'Full HD', kind: 'desktop', width: 1920, height: 1080, manufacturer: 'Generic', model: 'Full HD', dpr: 1, specStatus: 'verified', frameStyle: 'desktop', userAgent: UA_DESKTOP, touch: false }),
  item({ id: 'desktop-4k', label: '4K', kind: 'desktop', width: 3840, height: 2160, manufacturer: 'Generic', model: '4K Desktop', dpr: 1, specStatus: 'verified', frameStyle: 'desktop', userAgent: UA_DESKTOP, touch: false }),

  item({ id: 'apple-watch', label: 'Apple Watch', kind: 'watch', width: 198, height: 242, manufacturer: 'Apple', model: 'Apple Watch', dpr: 3, specStatus: 'approximate', frameStyle: 'watch', notch: 'none', statusBar: 'ios', navBar: 'none', userAgent: UA_IOS, safeArea: { top: 16, right: 8, bottom: 16, left: 8 }, frameColor: 'black' }),
  item({ id: 'android-watch', label: 'Android Watch', kind: 'watch', width: 192, height: 192, manufacturer: 'Google', model: 'Wear OS', dpr: 2, specStatus: 'approximate', frameStyle: 'watch', notch: 'none', statusBar: 'android', navBar: 'none', userAgent: UA_ANDROID, frameColor: 'black' }),
  item({ id: 'smartwatch', label: 'Smartwatch', kind: 'watch', width: 192, height: 192, manufacturer: 'Generic', model: 'Smartwatch', dpr: 2, specStatus: 'approximate', frameStyle: 'watch', statusBar: 'none', navBar: 'none' }),
  item({ id: 'kiosk', label: 'Kiosk', kind: 'special', width: 1080, height: 1920, manufacturer: 'Generic', model: 'Interactive kiosk', dpr: 1, specStatus: 'approximate', frameStyle: 'kiosk', statusBar: 'none', navBar: 'none', touch: true }),
  item({ id: 'pos', label: 'POS terminal', kind: 'special', width: 1024, height: 768, manufacturer: 'Generic', model: 'POS terminal', dpr: 1, specStatus: 'approximate', frameStyle: 'kiosk', statusBar: 'none', navBar: 'none', touch: true }),
  item({ id: 'zebra-scanner', label: 'Zebra scanner', kind: 'special', width: 480, height: 640, manufacturer: 'Zebra', model: 'Enterprise scanner', dpr: 1.5, specStatus: 'approximate', frameStyle: 'kiosk', statusBar: 'android', navBar: 'android', userAgent: UA_ANDROID, touch: true }),
  item({ id: 'smart-tv', label: 'Smart TV', kind: 'special', width: 1920, height: 1080, manufacturer: 'Generic', model: 'Smart TV', dpr: 1, specStatus: 'approximate', frameStyle: 'tv', statusBar: 'none', navBar: 'none', touch: false, userAgent: UA_DESKTOP }),
  item({ id: 'signage', label: 'Digital signage', kind: 'special', width: 1080, height: 1920, manufacturer: 'Generic', model: 'Digital signage', dpr: 1, specStatus: 'approximate', frameStyle: 'tv', statusBar: 'none', navBar: 'none', touch: true }),
]

export const DEVICE_BY_ID: ReadonlyMap<string, Device> = new Map(DEVICES.map((device) => [device.id, device]))

export const DEFAULT_DEVICE_ID = 'iphone-16-pro'
