import type { NavBarStyle, StatusBarStyle } from '@/tools/design/responsive-viewer/devices'

/** Safari URL bar + tab tools docked under the page preview (CSS px at 1x device scale). */
export const OVERLAY_SAFARI_CHROME_PX = 88

export interface OverlayPreviewChrome {
  /** Decorative iOS/Android status row over the page (hidden on photoreal mockups). */
  decorStatus: boolean
  /** Safari chrome reserves space below the page instead of covering it. */
  safariChrome: boolean
}

export function overlayPreviewChrome(opts: {
  hasMockup: boolean
  rotated: boolean
  showStatusBar: boolean
  statusBar: StatusBarStyle
  showSafari: boolean
}): OverlayPreviewChrome {
  const decorStatus =
    !opts.hasMockup && !opts.rotated && opts.showStatusBar && opts.statusBar !== 'none'
  const safariChrome = !opts.rotated && opts.showSafari
  return { decorStatus, safariChrome }
}

/** Iframe layout height: full device height minus Safari when it is docked. */
export function overlayIframeLayoutSize(
  screen: { width: number; height: number },
  chrome: OverlayPreviewChrome,
): { width: number; height: number } {
  let height = screen.height
  if (chrome.safariChrome) height = Math.max(240, height - OVERLAY_SAFARI_CHROME_PX)
  return { width: screen.width, height }
}

export function overlayHomeIndicatorVisible(
  showNavBar: boolean,
  navBar: NavBarStyle,
  rotated: boolean,
): boolean {
  return showNavBar && navBar === 'home-indicator' && !rotated
}