import { useTranslation } from 'react-i18next'

import {
  YOUTUBE_PRESETS,
  defaultYoutubeValues,
  type YoutubeFeatureValue,
  type YoutubePresetId,
} from '@/core/sites/youtube'
import { Button } from '@/shared/components/ui/button'

const PRESETS: YoutubePresetId[] = ['recommended', 'focus', 'player', 'reset']

export function PresetBar({
  onApply,
}: {
  onApply: (values: Record<string, YoutubeFeatureValue>) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((id) => (
        <Button
          key={id}
          type="button"
          size="sm"
          variant={id === 'reset' ? 'outline' : 'secondary'}
          className="text-xs"
          data-search-id={id === 'reset' ? undefined : `preset-${id}`}
          onClick={() => {
            if (id === 'reset') onApply(defaultYoutubeValues())
            else onApply({ ...defaultYoutubeValues(), ...YOUTUBE_PRESETS[id] })
          }}
        >
          {t(`sites.youtube.preset.${id}`)}
        </Button>
      ))}
    </div>
  )
}
