import type { NavBarStyle, StatusBarStyle } from '@/tools/design/responsive-viewer/devices'

export interface OverlayPreviewChrome {
  /** Decorative iOS/Android status row (hidden on photoreal mockups — bezel already has status/island). */
  decorStatus: boolean
  /** Safari bar overlaid on the page at the bottom; does not shrink the layout viewport. */
  showSafari: boolean
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
  const showSafari = !opts.rotated && opts.showSafari
  return { decorStatus, showSafari }
}

/** Full device layout viewport — content runs edge-to-edge under notch frame and Safari chrome. */
export function overlayIframeLayoutSize(screen: { width: number; height: number }): {
  width: number
  height: number
} {
  return { width: screen.width, height: screen.height }
}

export function overlayHomeIndicatorVisible(
  showNavBar: boolean,
  navBar: NavBarStyle,
  rotated: boolean,
): boolean {
  return showNavBar && navBar === 'home-indicator' && !rotated
}