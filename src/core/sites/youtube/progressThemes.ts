export interface ProgressThemeDef {
  id: string
  labelKey: string
  bar: string
  played: string
  animated?: boolean
}

/** Built-in progress bar themes (Custom Progress Bar–style). */
export const PROGRESS_THEMES: ProgressThemeDef[] = [
  { id: 'default', labelKey: 'sites.youtube.progress.default', bar: '#ff0000', played: '#cc0000' },
  { id: 'ocean', labelKey: 'sites.youtube.progress.ocean', bar: '#0ea5e9', played: '#0284c7' },
  { id: 'neon', labelKey: 'sites.youtube.progress.neon', bar: '#22d3ee', played: '#06b6d4', animated: true },
  { id: 'fire', labelKey: 'sites.youtube.progress.fire', bar: '#f97316', played: '#ea580c', animated: true },
  { id: 'gold', labelKey: 'sites.youtube.progress.gold', bar: '#eab308', played: '#ca8a04' },
  { id: 'forest', labelKey: 'sites.youtube.progress.forest', bar: '#22c55e', played: '#16a34a' },
  { id: 'violet', labelKey: 'sites.youtube.progress.violet', bar: '#a855f7', played: '#9333ea' },
  { id: 'rose', labelKey: 'sites.youtube.progress.rose', bar: '#f43f5e', played: '#e11d48' },
  { id: 'slate', labelKey: 'sites.youtube.progress.slate', bar: '#64748b', played: '#475569' },
  { id: 'rainbow', labelKey: 'sites.youtube.progress.rainbow', bar: 'linear-gradient(90deg,red,orange,yellow,green,blue,violet)', played: '#888', animated: true },
  { id: 'candy', labelKey: 'sites.youtube.progress.candy', bar: 'repeating-linear-gradient(45deg,#f472b6,#f472b6 8px,#fbcfe8 8px,#fbcfe8 16px)', played: '#db2777', animated: true },
  { id: 'pride', labelKey: 'sites.youtube.progress.pride', bar: 'linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#24408e,#732982)', played: '#555' },
  { id: 'midnight', labelKey: 'sites.youtube.progress.midnight', bar: '#312e81', played: '#1e1b4b' },
  { id: 'mint', labelKey: 'sites.youtube.progress.mint', bar: '#6ee7b7', played: '#34d399' },
  { id: 'sunset', labelKey: 'sites.youtube.progress.sunset', bar: 'linear-gradient(90deg,#f43f5e,#f97316,#fbbf24)', played: '#c2410c' },
  { id: 'ice', labelKey: 'sites.youtube.progress.ice', bar: '#bae6fd', played: '#7dd3fc' },
  { id: 'lava', labelKey: 'sites.youtube.progress.lava', bar: '#450a0a', played: '#dc2626', animated: true },
  { id: 'matrix', labelKey: 'sites.youtube.progress.matrix', bar: '#22c55e', played: '#14532d', animated: true },
  { id: 'cyber', labelKey: 'sites.youtube.progress.cyber', bar: '#f0abfc', played: '#c026d3', animated: true },
  { id: 'mono', labelKey: 'sites.youtube.progress.mono', bar: '#fafafa', played: '#a3a3a3' },
]

export function themeCssVars(themeId: string, customBar?: string, customPlayed?: string, height?: number): Record<string, string> {
  const theme = PROGRESS_THEMES.find((t) => t.id === themeId)
  let bar = theme?.bar ?? '#ff0000'
  let played = theme?.played ?? '#cc0000'
  if (themeId === 'custom' || !theme) {
    if (customBar) bar = customBar
    if (customPlayed) played = customPlayed
  }
  return {
    '--tbx-yt-progress-bar': bar,
    '--tbx-yt-progress-played': played,
    '--tbx-yt-progress-height': `${height ?? 3}px`,
  }
}
