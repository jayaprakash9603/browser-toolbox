import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoIcon } from 'lucide-react'

import {
  getAdblockState,
  isYoutubeAdblockEnabled,
  setYoutubeAdblockEnabled,
} from '@/core/adblock'
import { STORAGE_KEYS } from '@/core/constants'
import {
  featureDescKey,
  featureLabelKey,
  type YoutubeEnhancerState,
  type YoutubeFeatureDef,
  type YoutubeFeatureValue,
} from '@/core/sites/youtube'
import { Switch } from '@/shared/components/ui/switch'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'

export function FeatureRow({
  feature,
  state,
  onPatch,
}: {
  feature: YoutubeFeatureDef
  state: YoutubeEnhancerState
  onPatch: (values: Record<string, YoutubeFeatureValue>) => void
}) {
  const { t } = useTranslation()
  const value = state.values[feature.id]

  const label = (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1 text-xs font-medium">
        {t(featureLabelKey(feature.id))}
        {feature.thirdParty && (
          <InfoIcon className="size-3 text-muted-foreground" aria-label={t('sites.youtube.thirdParty')} />
        )}
        {feature.bestEffort && (
          <span className="text-[10px] font-normal text-muted-foreground">({t('sites.youtube.bestEffort')})</span>
        )}
      </p>
      <p className="text-[11px] text-muted-foreground">{t(featureDescKey(feature.id))}</p>
    </div>
  )

  if (feature.impl === 'mirror' && feature.id === 'blockAds') {
    return <MirrorAdblockRow label={label} youtubePanelEnabled={state.enabled} />
  }

  if (feature.kind === 'toggle') {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <Switch
          checked={value === true}
          disabled={!state.enabled}
          onCheckedChange={(checked) => onPatch({ [feature.id]: checked })}
          aria-label={t(featureLabelKey(feature.id))}
        />
      </li>
    )
  }

  if (feature.kind === 'number') {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <NumberField
          className="w-20"
          ariaLabel={t(featureLabelKey(feature.id))}
          value={String(value ?? feature.default)}
          min={feature.min}
          max={feature.max}
          disabled={!state.enabled}
          onChange={(raw) => {
            const n = parseNumberInRange(raw, feature.min, feature.max)
            if (n != null) onPatch({ [feature.id]: n })
          }}
        />
      </li>
    )
  }

  if (feature.kind === 'select' && feature.options) {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <Select
          value={String(value ?? feature.default)}
          disabled={!state.enabled}
          onValueChange={(v) => onPatch({ [feature.id]: v })}
        >
          <SelectTrigger className="w-[9rem]" aria-label={t(featureLabelKey(feature.id))}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {feature.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </li>
    )
  }

  if (feature.kind === 'color') {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <Input
          type="color"
          className="h-8 w-14 p-1"
          disabled={!state.enabled}
          value={String(value ?? feature.default)}
          onChange={(e) => onPatch({ [feature.id]: e.target.value })}
        />
      </li>
    )
  }

  if (feature.kind === 'text') {
    return (
      <li className="flex flex-col gap-1.5 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <Input
          className="text-xs"
          disabled={!state.enabled}
          value={String(value ?? '')}
          placeholder={feature.id.includes('Keyword') ? 'spam, clickbait' : '@channel'}
          onChange={(e) => onPatch({ [feature.id]: e.target.value })}
        />
      </li>
    )
  }

  return null
}

function MirrorAdblockRow({
  label,
  youtubePanelEnabled,
}: {
  label: ReactNode
  youtubePanelEnabled: boolean
}) {
  const { t } = useTranslation()
  const [on, setOn] = useState(true)

  const refresh = useCallback(() => {
    void getAdblockState().then((s) => setOn(isYoutubeAdblockEnabled(s)))
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.adblock]) refresh()
    }
    chrome.storage.onChanged.addListener(onStorage)
    return () => chrome.storage.onChanged.removeListener(onStorage)
  }, [refresh])

  return (
    <li className="flex items-center gap-3 px-3 py-2.5" data-search-id="blockAds">
      {label}
      <Switch
        checked={on}
        disabled={!youtubePanelEnabled}
        onCheckedChange={(checked) => {
          setOn(checked)
          void setYoutubeAdblockEnabled(checked)
        }}
        aria-label={t('sites.youtube.features.blockAds.label')}
      />
    </li>
  )
}
