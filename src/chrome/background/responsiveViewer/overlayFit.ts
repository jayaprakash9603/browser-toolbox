/** Stage math for the on-page simulator overlay. Injected with overlayMount. */

export const SIM_RAIL_PX = 76
export const SIM_RAIL_GAP = 16
export const SIM_STAGE_PAD_Y = 24
export const SIM_STAGE_PAD_LEFT = 24
export const SIM_PICKER_MAX = 440
export const SIM_PICKER_MIN = 300
export const SIM_PICKER_GAP = 20
export const SIM_CHASSIS_PAD = 20
export const SIM_MIN_SCALE = 0.15

export interface OverlayInsets {
  left: number
  top: number
  right: number
  bottom: number
}

/** Docked device catalog width — large enough for a visible tile grid, not a cramped popover. */
export function overlayPickerWidth(viewportWidth: number): number {
  return Math.min(SIM_PICKER_MAX, Math.max(SIM_PICKER_MIN, Math.round(viewportWidth * 0.34)))
}

export function overlayStageBox(viewport: { width: number; height: number }, pickerOpen: boolean) {
  const pickerWidth = pickerOpen ? overlayPickerWidth(viewport.width) : 0
  const rail = SIM_RAIL_PX + SIM_RAIL_GAP
  const dockedRight = rail + (pickerWidth ? pickerWidth + SIM_PICKER_GAP : 0)
  const maxH = Math.max(180, viewport.height - SIM_STAGE_PAD_Y * 2)
  const maxWRail = Math.max(180, viewport.width - SIM_STAGE_PAD_LEFT - rail)
  const maxWDocked = Math.max(180, viewport.width - SIM_STAGE_PAD_LEFT - dockedRight)
  const dockPicker = pickerOpen && maxWDocked >= 280
  return {
    maxW: dockPicker ? maxWDocked : maxWRail,
    maxH,
    pickerWidth,
    paddingRight: dockPicker ? dockedRight : rail,
    dockPicker,
  }
}

export function overlayOuterSize(
  screen: { width: number; height: number },
  mockup: OverlayInsets | null,
): { width: number; height: number } {
  if (!mockup) {
    return { width: screen.width + SIM_CHASSIS_PAD, height: screen.height + SIM_CHASSIS_PAD }
  }
  const holeW = 1 - mockup.left - mockup.right
  const holeH = 1 - mockup.top - mockup.bottom
  return { width: screen.width / holeW, height: screen.height / holeH }
}

/** Scale the true-size device to fill the stage. Allows upscaling so phones stay readable on large monitors. */
export function overlayFitScale(
  outer: { width: number; height: number },
  box: { maxW: number; maxH: number },
): number {
  if (outer.width <= 0 || outer.height <= 0) return 1
  return Math.max(SIM_MIN_SCALE, Math.min(box.maxW / outer.width, box.maxH / outer.height))
}
