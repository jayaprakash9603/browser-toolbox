import { mountRecorderCountdownOverlay } from './countdownOverlay'

/** Extension-page fallback when there is no return tab (pinned recorder tab only). */
export function showRecorderCountdown(seconds: number): void {
  const caption =
    typeof chrome !== 'undefined' && chrome.i18n?.getMessage
      ? chrome.i18n.getMessage('recorderCountdownCaption') || 'Recording starts…'
      : 'Recording starts…'
  mountRecorderCountdownOverlay(seconds, caption)
}
