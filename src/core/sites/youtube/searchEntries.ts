import type { ToolSearchEntry } from '@/core/registry'

import {
  featureLabelKey,
  sectionLabelKey,
  YOUTUBE_FEATURES,
} from './features'
import type { YoutubeSection } from './types'

const SECTION_ORDER: YoutubeSection[] = [
  'ads',
  'feeds',
  'watch',
  'player',
  'shorts',
  'appearance',
  'progress',
  'embedded',
  'community',
]

function titleFromId(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function getYoutubeSearchEntries(): ToolSearchEntry[] {
  const entries: ToolSearchEntry[] = []

  for (const section of SECTION_ORDER) {
    entries.push({
      id: `section-${section}`,
      labelKey: sectionLabelKey(section),
      fallbackLabel: titleFromId(section),
      keywords: [section, 'youtube'],
      params: { focus: `section-${section}` },
    })
  }

  entries.push({
    id: 'progress-picker',
    labelKey: 'sites.youtube.progress.title',
    fallbackLabel: 'Progress bar',
    keywords: ['progress', 'scrubber', 'youtube'],
    params: { focus: 'progress' },
  })

  for (const preset of ['recommended', 'focus', 'player'] as const) {
    entries.push({
      id: `preset-${preset}`,
      labelKey: `sites.youtube.preset.${preset}`,
      fallbackLabel: preset,
      keywords: ['preset', 'youtube'],
      params: { focus: `preset-${preset}` },
    })
  }

  for (const feature of YOUTUBE_FEATURES) {
    const labelWords = titleFromId(feature.id).toLowerCase()
    entries.push({
      id: feature.id,
      labelKey: featureLabelKey(feature.id),
      fallbackLabel: titleFromId(feature.id),
      keywords: [feature.section, 'youtube', labelWords],
      aliases: [`youtube ${labelWords}`],
      params: { focus: feature.id, section: feature.section },
    })
  }

  return entries
}
