import { useTranslation } from 'react-i18next'

import { Segmented } from '@/shared/components/ui/segmented'

import { DIGEST_PRESETS, type DigestPreset } from './useDigestSettings'

export function DigestPresetBar({
  value,
  onChange,
}: {
  value: DigestPreset
  onChange: (preset: DigestPreset) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{t('hashToolkit.preset.label')}</span>
      <Segmented
        value={value}
        onValueChange={(v) => onChange(v as DigestPreset)}
        ariaLabel={t('hashToolkit.preset.label')}
        size="sm"
        className="w-full max-w-md"
        options={DIGEST_PRESETS.map((preset) => ({
          value: preset,
          label: t(`hashToolkit.preset.${preset}`),
          title: t(`hashToolkit.preset.hint.${preset}`),
        }))}
      />
    </div>
  )
}
