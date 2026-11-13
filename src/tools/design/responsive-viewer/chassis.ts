import type { FrameColor } from './devices'

export interface ChassisFinish {
  fill: string
  ring: string
  button: string
  swatch: string
}

/** Physical finishes. Titanium is natural dark metal, not champagne gold. */
export const CHASSIS: Record<FrameColor, ChassisFinish> = {
  black: {
    fill: 'linear-gradient(155deg, #3a3a40 0%, #111114 38%, #070708 72%, #2a2a30 100%)',
    ring: 'rgba(255,255,255,0.14)',
    button: '#1a1a1e',
    swatch: '#111114',
  },
  silver: {
    fill: 'linear-gradient(155deg, #f8fafc 0%, #c7ccd4 40%, #9aa3ae 70%, #e8edf3 100%)',
    ring: 'rgba(15,23,42,0.18)',
    button: '#b8bec8',
    swatch: '#c7ccd4',
  },
  titanium: {
    fill: 'linear-gradient(155deg, #5a5560 0%, #322e38 30%, #16141a 62%, #3a3540 100%)',
    ring: 'rgba(255,255,255,0.16)',
    button: '#2a2630',
    swatch: '#322e38',
  },
  white: {
    fill: 'linear-gradient(155deg, #ffffff 0%, #e5e7eb 42%, #d1d5db 70%, #f8fafc 100%)',
    ring: 'rgba(15,23,42,0.16)',
    button: '#d4d4d8',
    swatch: '#e5e7eb',
  },
  graphite: {
    fill: 'linear-gradient(155deg, #6b7280 0%, #374151 40%, #111827 72%, #4b5563 100%)',
    ring: 'rgba(255,255,255,0.12)',
    button: '#2f3642',
    swatch: '#374151',
  },
}
