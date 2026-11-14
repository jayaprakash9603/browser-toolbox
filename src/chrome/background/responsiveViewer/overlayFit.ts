/** Stage math for the on-page simulator overlay. Injected with overlayMount. */

export const SIM_RAIL_PX = 58
export const SIM_RAIL_GAP = 16
export const SIM_STAGE_PAD_Y = 24
export const SIM_STAGE_PAD_LEFT = 24
export const SIM_SPLIT_GAP = 20
export const SIM_PICKER_MAX = 440
export const SIM_PICKER_MIN = 300
export const SIM_CHASSIS_PAD = 20
export const SIM_MIN_SCALE = 0.15

export interface OverlayInsets {
  left: number
  top: number
  right: number
  bottom: number
}

/** Device picker width when positioned beside the action rail (does not affect phone layout). */
export function overlayPickerWidth(viewportWidth: number): number {
  return Math.min(SIM_PICKER_MAX, Math.max(SIM_PICKER_MIN, Math.round(viewportWidth * 0.34)))
}

/** Available stage for the phone — rail is a viewport gutter on the right, picker floats above. */
export function overlayStageBox(
  viewport: { width: number; height: number },
  opts?: { panes?: number },
) {
  const panes = Math.max(1, opts?.panes ?? 1)
  const rail = SIM_RAIL_PX + SIM_RAIL_GAP
  const maxH = Math.max(180, viewport.height - SIM_STAGE_PAD_Y * 2)
  const gap = panes > 1 ? SIM_SPLIT_GAP * (panes - 1) : 0
  const usable = Math.max(180, viewport.width - SIM_STAGE_PAD_LEFT - rail - gap)
  const maxW = Math.max(140, Math.floor(usable / panes))
  return { maxW, maxH, paddingRight: rail }
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
  return Math.max(0.15, Math.min(box.maxW / outer.width, box.maxH / outer.height))
}