import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import {
  countActiveFeatures,
  formatCaptionForInstagram,
  INSTAGRAM_FEATURES,
  INSTAGRAM_PLAYBACK_SPEEDS,
  INSTAGRAM_SECTIONS,
  sectionLabelKey,
  toUnicodeBold,
  toUnicodeItalic,
  type InstagramFeatureValue,
} from '@/core/sites/instagram'
import { useInstagramSettings } from '@/features/sites/useInstagramSettings'
import { StaggerChildren, StaggerItem } from '@/shared/components/motion/StaggerChildren'
import { ToolPage } from '@/shared/components/ToolPage'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { SiteFeatureSection } from '../_components/SiteFeatureSection'
import { type SiteFeatureDef } from '../_components/SiteFeatureRow'
import { useSitesTool } from '../_shared'

const NS = 'sites.instagram'

const FEATURE_DEFS: SiteFeatureDef[] = INSTAGRAM_FEATURES.map((f) => {
  if (f.id === 'playbackSpeed') {
    return {
      id: f.id,
      kind: 'select',
      default: f.default,
      options: INSTAGRAM_PLAYBACK_SPEEDS.map((speed) => ({
        value: speed,
        labelKey: `sites.instagram.speed.${speed.replace('.', '_')}`,
      })),
    }
  }
  return { id: f.id, kind: 'toggle', default: f.default }
})

export default function InstagramControlPanelTool() {
  const { t } = useTranslation()
  const tool = useSitesTool('sites.instagram')
  const { state, patch } = useInstagramSettings()
  const [query, setQuery] = useState('')
  const [caption, setCaption] = useState('')
  const [formatted, setFormatted] = useState('')

  const active = useMemo(() => (state ? countActiveFeatures(state) : 0), [state])

  const applyCaption = (mode: 'spacing' | 'bold' | 'italic') => {
    let next = caption
    if (mode === 'spacing') next = formatCaptionForInstagram(caption)
    if (mode === 'bold') next = toUnicodeBold(caption)
    if (mode === 'italic') next = toUnicodeItalic(caption)
    setFormatted(next)
  }

  if (!state) {
    return (
      <ToolPage tool={tool}>
        <p className="text-xs text-muted-foreground">{t('nav.loading')}</p>
      </ToolPage>
    )
  }

  const onValues = (values: Record<string, InstagramFeatureValue>) => void patch({ values })

  return (
    <ToolPage tool={tool}>
      <StaggerChildren className="flex flex-col gap-3">
        <StaggerItem>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5 text-pink-600" />
                <div>
                  <h2 className="text-sm font-semibold">{t('sites.instagram.header.title')}</h2>
                  <p className="text-[11px] text-muted-foreground">{t('sites.instagram.header.subtitle')}</p>
                </div>
              </div>
              <Switch
                checked={state.enabled}
                onCheckedChange={(on) => void patch({ enabled: on })}
                aria-label={t('sites.instagram.header.title')}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t('sites.instagram.activeCount', { count: active })}
            </p>
            <Input
              className="mt-3 text-xs"
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </StaggerItem>

        {INSTAGRAM_SECTIONS.map((section) => (
          <StaggerItem key={section}>
            <SiteFeatureSection
              ns={NS}
              sectionId={section}
              sectionLabelKey={sectionLabelKey(section)}
              features={FEATURE_DEFS.filter((f) => INSTAGRAM_FEATURES.find((x) => x.id === f.id)?.section === section)}
              enabled={state.enabled}
              values={state.values}
              query={query}
              onPatch={onValues}
              onResetSection={() => {
                const defaults: Record<string, InstagramFeatureValue> = {}
                for (const f of INSTAGRAM_FEATURES.filter((x) => x.section === section)) {
                  defaults[f.id] = f.default
                }
                onValues(defaults)
              }}
            />
          </StaggerItem>
        ))}

        <StaggerItem>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">{t('sites.instagram.caption.title')}</h3>
            <p className="mb-2 text-[11px] text-muted-foreground">{t('sites.instagram.caption.subtitle')}</p>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={5} className="text-xs" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => applyCaption('spacing')}>
                {t('sites.instagram.caption.spacing')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyCaption('bold')}>
                {t('sites.instagram.caption.bold')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyCaption('italic')}>
                {t('sites.instagram.caption.italic')}
              </Button>
            </div>
            {formatted && (
              <div className="mt-3 flex flex-col gap-2">
                <Textarea readOnly value={formatted} rows={4} className="text-xs" />
                <CopyButton text={formatted} label={t('common.copy')} />
              </div>
            )}
          </div>
        </StaggerItem>
      </StaggerChildren>
    </ToolPage>
  )
}
