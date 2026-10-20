import { useTranslation } from 'react-i18next'

import {
  defaultWhatsappValues,
  WHATSAPP_PRESETS,
  type WhatsappFeatureValue,
  type WhatsappPresetId,
} from '@/core/sites/whatsapp'
import { Button } from '@/shared/components/ui/button'

export function PresetBar({
  onApply,
}: {
  onApply: (values: Record<string, WhatsappFeatureValue>) => void
}) {
  const { t } = useTranslation()
  const presets: WhatsappPresetId[] = ['privacy', 'clean', 'reset']
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">
      {presets.map((id) => (
        <Button
          key={id}
          type="button"
          size="sm"
          variant="secondary"
          className="text-xs"
          data-search-id={`preset-${id}`}
          onClick={() => {
            if (id === 'reset') onApply(defaultWhatsappValues())
            else onApply(WHATSAPP_PRESETS[id])
          }}
        >
          {t(`sites.whatsapp.preset.${id}`)}
        </Button>
      ))}
    </div>
  )
}
