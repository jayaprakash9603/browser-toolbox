import { useTranslation } from 'react-i18next'

import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import type { PaletteId } from '@/shared/lib/theme/palettes'
import { PALETTES } from '@/shared/lib/theme/palettes'

interface PalettePickerProps {
  value: PaletteId
  onChange: (palette: PaletteId) => void
}

export function PalettePicker({ value, onChange }: PalettePickerProps) {
  const { t } = useTranslation()

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as PaletteId)}
      aria-label={t('settings.palette')}
      className="grid max-w-full grid-cols-2 gap-2 @[360px]:grid-cols-3"
    >
      {PALETTES.map((palette) => (
        <label
          key={palette.id}
          className="flex min-h-11 cursor-pointer flex-col gap-1.5 rounded-lg border border-border bg-card p-2 transition-[border-color,box-shadow] duration-150 hover:border-primary/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:shadow-sm has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary/25"
        >
          <span className="flex items-center gap-1">
            <RadioGroupItem value={palette.id} className="mr-1" />
            {palette.swatches.map((color) => (
              <span
                key={color}
                className="size-4 rounded-full border border-black/5 dark:border-white/10"
                style={{ backgroundColor: color }}
                aria-hidden
              />
            ))}
          </span>
          <span className="text-[11px] font-medium leading-tight">{t(palette.labelKey)}</span>
        </label>
      ))}
    </RadioGroup>
  )
}
