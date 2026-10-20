import { useTranslation } from 'react-i18next'
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

export interface SiteFeatureDef {
  id: string
  kind: 'toggle' | 'select' | 'number' | 'color' | 'text'
  default: boolean | number | string
  bestEffort?: boolean
  min?: number
  max?: number
  options?: { value: string; labelKey: string }[]
}

export function SiteFeatureRow<N extends string>({
  ns,
  feature,
  enabled,
  value,
  onPatch,
}: {
  ns: N
  feature: SiteFeatureDef
  enabled: boolean
  value: boolean | number | string | undefined
  onPatch: (values: Record<string, boolean | number | string>) => void
}) {
  const { t } = useTranslation()
  const labelKey = `${ns}.features.${feature.id}.label`
  const descKey = `${ns}.features.${feature.id}.description`

  const label = (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1 text-xs font-medium">
        {t(labelKey)}
        {feature.bestEffort && (
          <span className="text-[10px] font-normal text-muted-foreground">({t(`${ns}.bestEffort`)})</span>
        )}
      </p>
      <p className="text-[11px] text-muted-foreground">{t(descKey)}</p>
    </div>
  )

  if (feature.kind === 'toggle') {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <Switch
          checked={value === true}
          disabled={!enabled}
          onCheckedChange={(checked) => onPatch({ [feature.id]: checked })}
          aria-label={t(labelKey)}
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
          ariaLabel={t(labelKey)}
          value={String(value ?? feature.default)}
          min={feature.min}
          max={feature.max}
          disabled={!enabled}
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
          disabled={!enabled}
          onValueChange={(v) => onPatch({ [feature.id]: v })}
        >
          <SelectTrigger className="w-[9rem]" aria-label={t(labelKey)}>
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

  if (feature.kind === 'text') {
    return (
      <li className="flex flex-col gap-1.5 px-3 py-2.5" data-search-id={feature.id}>
        {label}
        <Input
          className="text-xs"
          type={feature.id.toLowerCase().includes('apikey') ? 'password' : 'text'}
          disabled={!enabled}
          value={String(value ?? '')}
          onChange={(e) => onPatch({ [feature.id]: e.target.value })}
        />
      </li>
    )
  }

  return null
}
