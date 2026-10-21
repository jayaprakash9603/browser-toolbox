import {
  INSTAGRAM_FEATURES,
  INSTAGRAM_SECTIONS,
  featureDescKey,
  featureLabelKey,
  sectionLabelKey,
} from '@/core/sites/instagram'

function labelFor(id: string): string {
  const labels: Record<string, string> = {
    videoControls: 'Video controls',
    playbackSpeed: 'Playback speed',
    pictureInPicture: 'Picture-in-Picture',
    mediaDownload: 'Media download button',
    ghostStories: 'Ghost story viewing',
  }
  return labels[id] ?? id
}

function descriptionFor(id: string): string {
  const descriptions: Record<string, string> = {
    videoControls: 'Show seek bar and native controls on Reels videos.',
    playbackSpeed: 'Default speed for Instagram videos.',
    pictureInPicture: 'Double-click video to toggle PiP.',
    mediaDownload: 'Floating download on videos.',
    ghostStories: 'Block story “seen” beacons (does not hide UI).',
  }
  return descriptions[id] ?? ''
}

const featureStrings: Record<string, string> = {}
for (const f of INSTAGRAM_FEATURES) {
  featureStrings[featureLabelKey(f.id)] = labelFor(f.id)
  featureStrings[featureDescKey(f.id)] = descriptionFor(f.id)
}

const sectionStrings: Record<string, string> = {}
for (const section of INSTAGRAM_SECTIONS) {
  const labels: Record<string, string> = {
    player: 'Player',
    download: 'Download',
    privacy: 'Privacy',
  }
  sectionStrings[sectionLabelKey(section)] = labels[section] ?? section
}

export const sitesInstagramStrings: Record<string, string> = {
  'tools.sites.instagram.name': 'Instagram Control Panel',
  'tools.sites.instagram.description':
    'Reels player controls, media download, caption formatter, and ghost story viewing on instagram.com',
  'sites.instagram.settings.link': 'Open Instagram Control Panel',
  'sites.instagram.settings.title': 'Instagram Control Panel',
  'sites.instagram.header.title': 'Instagram Control Panel',
  'sites.instagram.header.subtitle': 'Player tools, downloads, captions, and privacy on instagram.com',
  'sites.instagram.activeCount': '{{count}} enhancements active',
  'sites.instagram.search': 'Search options…',
  'sites.instagram.bestEffort': 'best effort',
  'sites.instagram.resetSection': 'Reset section',
  'sites.instagram.speed.0_75': '0.75×',
  'sites.instagram.speed.1': '1×',
  'sites.instagram.speed.1_25': '1.25×',
  'sites.instagram.speed.1_5': '1.5×',
  'sites.instagram.speed.2': '2×',
  'sites.instagram.caption.title': 'Caption formatter',
  'sites.instagram.caption.subtitle': 'Spacing and Unicode styles for captions.',
  'sites.instagram.caption.spacing': 'Fix line breaks',
  'sites.instagram.caption.bold': 'Bold Unicode',
  'sites.instagram.caption.italic': 'Italic Unicode',
  ...sectionStrings,
  ...featureStrings,
}
