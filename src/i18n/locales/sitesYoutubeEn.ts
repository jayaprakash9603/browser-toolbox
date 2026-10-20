import {
  YOUTUBE_FEATURES,
  YOUTUBE_SECTIONS,
  featureDescKey,
  featureLabelKey,
  sectionLabelKey,
} from '@/core/sites/youtube'

function title(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

const base: Record<string, string> = {
  'categories.sites.name': 'Site Enhancements',
  'categories.sites.description': 'Per-site tweaks and control panels',
  'toolkitGroups.sites': 'Site enhancements',
  'tools.sites.youtube.name': 'YouTube Control Panel',
  'tools.sites.youtube.description':
    'Hide clutter, tune the player, custom progress bar, and optional SponsorBlock',
  'sites.youtube.header.title': 'YouTube enhancements',
  'sites.youtube.header.subtitle': 'Control Panel, player tools, and feed filters in one place',
  'sites.youtube.header.active': '{{count}} options active',
  'sites.youtube.search': 'Search options…',
  'sites.youtube.preset.recommended': 'Recommended',
  'sites.youtube.preset.focus': 'Focus mode',
  'sites.youtube.preset.player': 'Player power-user',
  'sites.youtube.preset.reset': 'Reset all',
  'sites.youtube.thirdParty': 'Uses a third-party API when enabled',
  'sites.youtube.bestEffort': 'Best-effort — YouTube UI changes may break this',
  'sites.youtube.progress.title': 'Progress bar',
  'sites.youtube.settings.title': 'Site enhancements',
  'sites.youtube.settings.link': 'Open YouTube Control Panel',
  'sites.youtube.options.thumbDefault': 'Default',
  'sites.youtube.options.thumbLarge': 'Large',
  'sites.youtube.options.thumbSmall': 'Small',
  'sites.youtube.options.progressDefault': 'YouTube default',
  'sites.youtube.options.progressCustom': 'Custom colors',
  'sites.youtube.options.qualityAuto': 'Auto',
  'sites.youtube.options.quality144': '144p',
  'sites.youtube.options.quality360': '360p',
  'sites.youtube.options.quality480': '480p',
  'sites.youtube.options.quality720': '720p',
  'sites.youtube.options.quality1080': '1080p',
  'sites.youtube.options.speed025': '0.25×',
  'sites.youtube.options.speed05': '0.5×',
  'sites.youtube.options.speed075': '0.75×',
  'sites.youtube.options.speed1': 'Normal',
  'sites.youtube.options.speed125': '1.25×',
  'sites.youtube.options.speed15': '1.5×',
  'sites.youtube.options.speed175': '1.75×',
  'sites.youtube.options.speed2': '2×',
}

for (const section of YOUTUBE_SECTIONS) {
  base[sectionLabelKey(section)] = title(section)
}

for (const f of YOUTUBE_FEATURES) {
  base[featureLabelKey(f.id)] = title(f.id)
  base[featureDescKey(f.id)] =
    f.thirdParty
      ? 'Opt-in: sends video identifiers to a community API when you watch a video.'
      : `Adjust YouTube: ${title(f.id)}.`
}

export const sitesYoutubeStrings = base
