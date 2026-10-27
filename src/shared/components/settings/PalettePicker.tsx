import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckIcon } from 'lucide-react'

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  PALETTE_FAMILIES,
  PALETTES,
  getPalette,
  type PaletteDefinition,
  type PaletteFamily,
  type PaletteId,
} from '@/shared/lib/theme/palettes'
import { cn } from '@/shared/utils/cn'

interface PalettePickerProps {
  value: PaletteId
  onChange: (palette: PaletteId) => void
}

type Filter = PaletteFamily | 'all'

const FAMILY_DOT: Record<PaletteFamily, string> = {
  red: '#e11d48',
  orange: '#ea580c',
  green: '#16a34a',
  blue: '#2563eb',
  purple: '#7c3aed',
  neutral: '#64748b',
}

/** Primary, secondary and accent in one disc: half primary, then a quarter each. */
function swatchFill([a, b, c]: PaletteDefinition['swatches']): string {
  return `linear-gradient(135deg, ${a} 0 50%, ${b} 50% 75%, ${c} 75%)`
}

/**
 * Compact palette chooser: every palette is a small swatch in one grid, narrowed by hue family.
 * The summary line names the selected palette, or the one under the pointer while browsing.
 */
export function PalettePicker({ value, onChange }: PalettePickerProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState<Filter>('all')
  const [hovered, setHovered] = useState<PaletteId | null>(null)

  const selected = getPalette(value)
  const shown = getPalette(hovered ?? value)
  const visible = filter === 'all' ? PALETTES : PALETTES.filter((palette) => palette.family === filter)
  const count = (family: Filter) =>
    family === 'all' ? PALETTES.length : PALETTES.filter((palette) => palette.family === family).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-2.5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm transition-[background] duration-300"
          style={{ background: `linear-gradient(135deg, ${shown.light.hero.join(', ')})` }}
          aria-hidden
        >
          <span className="size-3 rounded-full bg-white/90 ring-2 ring-white/40" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold">{t(shown.labelKey)}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {hovered && hovered !== value
              ? t('settings.paletteUi.preview', { current: t(selected.labelKey) })
              : t(`settings.paletteUi.family.${shown.family}`)}
          </span>
        </span>
        <span className="flex shrink-0 -space-x-1.5" aria-hidden>
          {shown.swatches.map((color, index) => (
            <span
              key={index}
              className="size-5 rounded-full border-2 border-card transition-colors duration-300"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </div>

      <Tabs value={filter} onValueChange={(next) => setFilter(next as Filter)} className="gap-0">
        <TabsList aria-label={t('settings.paletteUi.families')} className="max-w-full">
          {(['all', ...PALETTE_FAMILIES] as const).map((family) => (
            <TabsTrigger key={family} value={family} count={count(family)}>
              {family !== 'all' && (
                <span
                  className="size-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                  style={{ backgroundColor: FAMILY_DOT[family] }}
                  aria-hidden
                />
              )}
              {t(`settings.paletteUi.family.${family}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={(next) => onChange(next as PaletteId)}
        aria-label={t('settings.palette')}
        loop
        className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2"
        onPointerLeave={() => setHovered(null)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((palette) => {
            const active = palette.id === value
            const name = t(palette.labelKey)
            return (
              <motion.div
                key={palette.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex justify-center"
              >
                <RadioGroupPrimitive.Item
                  value={palette.id}
                  aria-label={name}
                  title={name}
                  onPointerEnter={() => setHovered(palette.id)}
                  onFocus={() => setHovered(palette.id)}
                  onBlur={() => setHovered(null)}
                  className="group relative flex size-9 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  {active && (
                    <motion.span
                      layoutId="palette-picker-ring"
                      className="absolute -inset-[3px] rounded-full ring-2 ring-foreground/70"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'absolute inset-0 rounded-full shadow-sm ring-1 ring-black/10 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100 dark:ring-white/15',
                      active && 'scale-90 group-hover:scale-95',
                    )}
                    style={{ background: swatchFill(palette.swatches) }}
                    aria-hidden
                  />
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        initial={reduce ? false : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="relative flex size-4 items-center justify-center rounded-full bg-white text-black shadow"
                        aria-hidden
                      >
                        <CheckIcon className="size-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </RadioGroupPrimitive.Item>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </RadioGroupPrimitive.Root>
    </div>
  )
}
