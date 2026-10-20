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
  'sites.youtube.progress.pickerHint': 'Pick a style — animations apply on the YouTube player. Use emoji or image URL below for the scrubber.',
  'sites.youtube.progress.scrubberEmojis': 'Scrubber emoji (on the playhead)',
  'sites.youtube.progress.scrubberPick': 'Use {{emoji}} on scrubber',
  'sites.youtube.progress.scrubberClear': 'Clear',
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

// Progress bar section (overrides auto-generated feature titles)
Object.assign(base, {
  'sites.youtube.features.blockAds.label': 'Block ads on YouTube',
  'sites.youtube.features.blockAds.description':
    'Uses the extension Ad blocker (YouTube filter list and player scripts). Off = allow ads on YouTube only; other sites unchanged.',
  'sites.youtube.features.hideSponsored.description':
    'Optional CSS cleanup for leftover promo tiles — not a replacement for Ad blocker.',
  'sites.youtube.sections.progress': 'Progress bar',
  'sites.youtube.features.progressTheme.label': 'Progress theme',
  'sites.youtube.features.progressTheme.description':
    'Preset look for the player progress bar, or custom colors below.',
  'sites.youtube.features.progressBarColor.label': 'Progress bar color',
  'sites.youtube.features.progressBarColor.description': 'Color of the unplayed portion of the bar.',
  'sites.youtube.features.progressPlayedColor.label': 'Progress played color',
  'sites.youtube.features.progressPlayedColor.description': 'Color of the played portion of the bar.',
  'sites.youtube.features.progressHeight.label': 'Progress height',
  'sites.youtube.features.progressHeight.description': 'Thickness of the progress bar in pixels (2–12).',
  'sites.youtube.features.progressScrubberEmoji.label': 'Scrubber emoji',
  'sites.youtube.features.progressScrubberEmoji.description': 'Shows on the playhead instead of the default dot (quick picks in the grid above).',
  'sites.youtube.features.progressScrubberImage.label': 'Scrubber image URL',
  'sites.youtube.features.progressScrubberImage.description': 'HTTPS or data:image URL for a custom playhead icon (overrides emoji).',
  'sites.youtube.progress.default': 'YouTube default',
  'sites.youtube.progress.ocean': 'Ocean',
  'sites.youtube.progress.neon': 'Neon',
  'sites.youtube.progress.fire': 'Fire',
  'sites.youtube.progress.gold': 'Gold',
  'sites.youtube.progress.forest': 'Forest',
  'sites.youtube.progress.violet': 'Violet',
  'sites.youtube.progress.rose': 'Rose',
  'sites.youtube.progress.slate': 'Slate',
  'sites.youtube.progress.rainbow': 'Rainbow',
  'sites.youtube.progress.candy': 'Candy',
  'sites.youtube.progress.pride': 'Pride',
  'sites.youtube.progress.midnight': 'Midnight',
  'sites.youtube.progress.mint': 'Mint',
  'sites.youtube.progress.sunset': 'Sunset',
  'sites.youtube.progress.ice': 'Ice',
  'sites.youtube.progress.lava': 'Lava',
  'sites.youtube.progress.matrix': 'Matrix',
  'sites.youtube.progress.cyber': 'Cyber',
  'sites.youtube.progress.mono': 'Mono',
})

export const sitesYoutubeStrings = base
