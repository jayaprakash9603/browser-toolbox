import { useTranslation } from 'react-i18next'

import type { PaletteId } from '@/shared/lib/theme/palettes'
import { PALETTES } from '@/shared/lib/theme/palettes'
import { cn } from '@/shared/utils/cn'

interface PalettePickerProps {
  value: PaletteId
  onChange: (palette: PaletteId) => void
}

export function PalettePicker({ value, onChange }: PalettePickerProps) {
  const { t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.palette')}
      className="grid max-w-full grid-cols-2 gap-2 @[360px]:grid-cols-3"
    >
      {PALETTES.map((palette) => {
        const selected = value === palette.id
        return (
          <button
            key={palette.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(palette.id)}
            className={cn(
              'flex min-h-11 flex-col gap-1.5 rounded-lg border p-2 text-left outline-none transition-[border-color,box-shadow,transform] duration-150',
              'hover:border-primary/40 active:scale-[0.98]',
              'focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary shadow-sm ring-1 ring-primary/25' : 'border-border bg-card',
            )}
          >
            <span className="flex gap-1">
              {palette.swatches.map((color) => (
                <span
                  key={color}
                  className="size-4 rounded-full border border-black/5 dark:border-white/10"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
              ))}
            </span>
            <span className="text-[11px] font-medium leading-tight">
              {t(palette.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
