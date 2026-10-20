import type { SpeedPhase } from '@/core/speedtest'

export const SPEED_DOWN = 'var(--speed-down)'
export const SPEED_UP = 'var(--speed-up)'

export function phaseColor(phase: SpeedPhase): string {
  return phase === 'upload' ? SPEED_UP : SPEED_DOWN
}
