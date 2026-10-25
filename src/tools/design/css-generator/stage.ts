import type { CSSProperties } from 'react'

export type Stage = 'light' | 'dark' | 'checker'

export const STAGE_STYLES: Record<Stage, CSSProperties> = {
  light: { backgroundColor: '#f1f5f9' },
  dark: { backgroundColor: '#0f172a' },
  checker: {
    backgroundColor: '#ffffff',
    backgroundImage: 'conic-gradient(#e2e8f0 25%, transparent 0 50%, #e2e8f0 0 75%, transparent 0)',
    backgroundSize: '16px 16px',
  },
}
