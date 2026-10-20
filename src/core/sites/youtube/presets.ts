import type { YoutubeFeatureValue } from './types'

export type YoutubePresetId = 'recommended' | 'focus' | 'player' | 'reset'

export const YOUTUBE_PRESETS: Record<Exclude<YoutubePresetId, 'reset'>, Record<string, YoutubeFeatureValue>> = {
  recommended: {
    hideSponsored: true,
    hidePremiumUpsell: true,
    hideAiSummaries: true,
    hideShortsShelf: true,
    hideEndCards: true,
    hideEndscreen: true,
    noPinkGradient: true,
    redirectShorts: false,
  },
  focus: {
    disableHomeFeed: true,
    hideRelated: true,
    hideComments: true,
    hideShorts: true,
    hideShortsShelf: true,
    hideSuggestedSections: true,
    hideNextButton: true,
  },
  player: {
    wheelVolume: true,
    speedHotkeys: true,
    rememberVolume: true,
    loopButton: true,
    defaultSpeed: '1.25',
    progressTheme: 'neon',
  },
}
