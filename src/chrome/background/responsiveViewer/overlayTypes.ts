import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import type { FrameColor, FrameStyle, NavBarStyle, NotchStyle, StatusBarStyle } from '@/tools/design/responsive-viewer/devices'

export const SIMULATOR_OVERLAY_ID = 'tbx-simulator-overlay'

export interface SimulatorOverlayFinish {
  fill: string
  ring: string
  button: string
}

export interface SimulatorOverlayInsets {
  left: number
  top: number
  right: number
  bottom: number
}

export type SimulatorOverlayUiTheme = 'classic' | 'dark'

export interface SimulatorOverlayUiSettings {
  theme: SimulatorOverlayUiTheme
  showStatusBar: boolean
  showNavBar: boolean
  mobileUa: boolean
  unblock: boolean
}

export interface SimulatorOverlayConfig {
  url: string
  label: string
  deviceId: string
  width: number
  height: number
  color: FrameColor
  finish: SimulatorOverlayFinish
  notch: NotchStyle
  navBar: NavBarStyle
  statusBar: StatusBarStyle
  frameStyle: FrameStyle
  showSafari: boolean
  ui: SimulatorOverlayUiSettings
  hostname: string
  studioUrl: string
  mockupUrl?: string
  mockupInsets?: SimulatorOverlayInsets
  replace?: boolean
}

export function canOverlaySimulatorOnTab(tabUrl: string | undefined, targetUrl: string): boolean {
  if (!tabUrl || isRestrictedCaptureUrl(tabUrl) || isRestrictedCaptureUrl(targetUrl)) return false
  if (!/^https?:/i.test(tabUrl) || !/^https?:/i.test(targetUrl)) return false
  try {
    return new URL(tabUrl).origin === new URL(targetUrl).origin
  } catch {
    return false
  }
}
