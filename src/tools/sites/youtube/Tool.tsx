import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlaySquareIcon } from 'lucide-react'

import {
  countActiveFeatures,
  YOUTUBE_FEATURES,
  YOUTUBE_SECTIONS,
  type YoutubeFeatureValue,
} from '@/core/sites/youtube'
import { useYoutubeSettings } from '@/features/sites/useYoutubeSettings'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion/StaggerChildren'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Input } from '@/shared/components/ui/input'

import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { useSitesTool } from '../_shared'
import { FeatureSection } from './FeatureSection'
import { PresetBar } from './PresetBar'
import { ProgressBarPicker } from './ProgressBarPicker'

export default function YoutubeControlPanelTool() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.youtube')
  const { state, patch } = useYoutubeSettings()
  useFocusTarget()
  const [query, setQuery] = useState('')

  const active = useMemo(() => (state ? countActiveFeatures(state) : 0), [state])

  if (!state) {
    return (
      <ToolPage tool={tool}>
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      </ToolPage>
    )
  }

  const onValues = (values: Record<string, YoutubeFeatureValue>) => void patch({ values })

  return (
    <ToolPage tool={tool}>
      <StaggerChildren className="flex flex-col gap-3">
        <StaggerItem>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <PlaySquareIcon className="size-5 text-red-600" />
                <div>
                  <h2 className="text-sm font-semibold">{t('sites.youtube.header.title')}</h2>
                  <p className="text-[11px] text-muted-foreground">{t('sites.youtube.header.subtitle')}</p>
                </div>
              </div>
              <Switch
                checked={state.enabled}
                onCheckedChange={(on) => void patch({ enabled: on })}
                aria-label={t('sites.youtube.header.title')}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('sites.youtube.header.active', { count: active })}
            </p>
            <Input
              className="mt-3 text-xs"
              placeholder={t('sites.youtube.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </StaggerItem>
        <StaggerItem>
          <PresetBar onApply={(values) => void patch({ values })} />
        </StaggerItem>
        <StaggerItem>
          <ProgressBarPicker state={state} onPatch={onValues} />
        </StaggerItem>
        {YOUTUBE_SECTIONS.filter((section) => section !== 'progress').map((section) => (
          <StaggerItem key={section}>
            <FeatureSection
              section={section}
              state={state}
              query={query}
              onPatch={onValues}
              onResetSection={() => {
                const defaults: Record<string, YoutubeFeatureValue> = {}
                for (const f of YOUTUBE_FEATURES.filter((x) => x.section === section)) {
                  defaults[f.id] = f.default
                }
                onValues(defaults)
              }}
            />
          </StaggerItem>
        ))}
      </StaggerChildren>
    </ToolPage>
  )
}
