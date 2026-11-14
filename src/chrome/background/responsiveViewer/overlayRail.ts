/** Rail icons from Mobile FIRST icomoon (personal Chrome extension install). */

export const OVERLAY_MDI = {
  close: '\ue915',
  devices: '\ue917',
  settings: '\ue905',
  rotate: '\ue90a',
  reload: '\ue911',
  screenshot: '\ue903',
  video: '\ue90e',
  compare: '\ue92b',
  launch: '\ue92f',
  help: '\ue926',
  message: '\ue900',
  faq: '\ue90f',
} as const

export function overlaySimFontUrl(): string {
  const path = 'simulator/fonts/icomoon.ttf'
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL(path)
  } catch {
    /* tests / page context */
  }
  return `/${path}`
}

export function overlayMdi(glyph: string): string {
  return `<i class="mdi" aria-hidden="true">${glyph}</i>`
}