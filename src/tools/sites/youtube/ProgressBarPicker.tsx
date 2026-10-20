import { useTranslation } from 'react-i18next'

import {
  PROGRESS_THEMES,
  type ProgressThemeDef,
  type YoutubeEnhancerState,
  type YoutubeFeatureValue,
} from '@/core/sites/youtube'

const PREVIEW_PLAYED = 0.62
const SCRUBBER_EMOJIS = ['🔥', '⭐', '🎮', '💎', '🚀', '🎯', '✨', '🎵']

function previewEffectClass(th: ProgressThemeDef): string {
  if (!th.animated) return ''
  return th.effect ? `tbx-yt-preview-${th.effect}` : 'tbx-yt-preview-shimmer'
}

export function ProgressBarPicker({
  state,
  onPatch,
}: {
  state: YoutubeEnhancerState
  onPatch: (values: Record<string, YoutubeFeatureValue>) => void
}) {
  const { t } = useTranslation()
  const theme = String(state.values.progressTheme ?? 'default')
  const scrubberEmoji = String(state.values.progressScrubberEmoji ?? '').trim()

  return (
    <div className="rounded-xl border bg-card p-3">
      <style>{`
        @keyframes tbx-yt-preview-shimmer { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4)} }
        @keyframes tbx-yt-preview-glow { 0%,100%{box-shadow:0 0 0 transparent} 50%{box-shadow:0 0 8px rgba(255,255,255,.45)} }
        @keyframes tbx-yt-preview-flow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes tbx-yt-preview-matrix { 0%,100%{opacity:.9} 50%{opacity:1;filter:hue-rotate(12deg)} }
        .tbx-yt-preview-shimmer .tbx-yt-preview-played { animation: tbx-yt-preview-shimmer 1.8s ease-in-out infinite; }
        .tbx-yt-preview-glow .tbx-yt-preview-played { animation: tbx-yt-preview-glow 2s ease-in-out infinite; }
        .tbx-yt-preview-flow .tbx-yt-preview-track,
        .tbx-yt-preview-flow .tbx-yt-preview-played { background-size: 200% 100%; animation: tbx-yt-preview-flow 3.5s linear infinite; }
        .tbx-yt-preview-matrix .tbx-yt-preview-played { animation: tbx-yt-preview-matrix 1.1s steps(3,end) infinite; }
      `}</style>
      <p className="mb-2 text-xs font-semibold">{t('sites.youtube.progress.title')}</p>
      <p className="mb-2 text-[10px] text-muted-foreground">{t('sites.youtube.progress.pickerHint')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {PROGRESS_THEMES.map((th) => {
          const selected = theme === th.id
          const fx = previewEffectClass(th)
          return (
            <button
              key={th.id}
              type="button"
              disabled={!state.enabled}
              className={`rounded-lg border p-2 text-left transition-shadow ${selected ? 'ring-2 ring-primary shadow-sm' : 'hover:bg-muted/40'}`}
              onClick={() => onPatch({ progressTheme: th.id })}
            >
              <div
                className={`relative mb-1.5 h-2.5 w-full overflow-hidden rounded-full ${fx}`}
                aria-hidden
              >
                <div className="tbx-yt-preview-track absolute inset-0 rounded-full" style={{ background: th.bar }} />
                <div
                  className="tbx-yt-preview-played absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${PREVIEW_PLAYED * 100}%`, background: th.played }}
                />
                <div
                  className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border border-white/80 bg-white shadow"
                  style={{ left: `calc(${PREVIEW_PLAYED * 100}% - 5px)` }}
                />
              </div>
              <span className="text-[10px] font-medium leading-tight">{t(th.labelKey)}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 border-t pt-3">
        <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">{t('sites.youtube.progress.scrubberEmojis')}</p>
        <div className="flex flex-wrap gap-1">
          {SCRUBBER_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={!state.enabled}
              className={`flex size-8 items-center justify-center rounded-md border text-base ${scrubberEmoji === emoji ? 'ring-2 ring-primary bg-muted' : 'hover:bg-muted/50'}`}
              onClick={() => onPatch({ progressScrubberEmoji: emoji, progressScrubberImage: '' })}
              aria-label={t('sites.youtube.progress.scrubberPick', { emoji })}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            disabled={!state.enabled || !scrubberEmoji}
            className="rounded-md border px-2 text-[10px] text-muted-foreground hover:bg-muted/50"
            onClick={() => onPatch({ progressScrubberEmoji: '' })}
          >
            {t('sites.youtube.progress.scrubberClear')}
          </button>
        </div>
      </div>
    </div>
  )
}
