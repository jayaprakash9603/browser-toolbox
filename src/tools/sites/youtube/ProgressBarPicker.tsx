import { useTranslation } from 'react-i18next'

import { PROGRESS_THEMES, type YoutubeEnhancerState, type YoutubeFeatureValue } from '@/core/sites/youtube'

export function ProgressBarPicker({
  state,
  onPatch,
}: {
  state: YoutubeEnhancerState
  onPatch: (values: Record<string, YoutubeFeatureValue>) => void
}) {
  const { t } = useTranslation()
  const theme = String(state.values.progressTheme ?? 'default')
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-xs font-semibold">{t('sites.youtube.progress.title')}</p>
      <div className="grid grid-cols-4 gap-2">
        {PROGRESS_THEMES.map((th) => (
          <button
            key={th.id}
            type="button"
            disabled={!state.enabled}
            className={`rounded-md border p-1 text-[10px] ${theme === th.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onPatch({ progressTheme: th.id })}
          >
            <div
              className="mb-1 h-1.5 w-full rounded-full"
              style={{ background: th.bar }}
              aria-hidden
            />
            {t(th.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
