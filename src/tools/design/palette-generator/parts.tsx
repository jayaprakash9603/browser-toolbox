import { useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { CheckIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'
import { SPRING } from './labels'
import { wcagLevel, type WcagLevel } from './paletteModel'

export interface ChipOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
  icon?: ReactNode
}

/** Wrapping radio group drawn as chips, with a highlight that slides to the selection. */
export function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  layoutId,
  className,
  disabled,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly ChipOption<T>[]
  layoutId: string
  className?: string
  disabled?: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (from: number, step: number) => {
    const index = (from + step + options.length) % options.length
    onChange(options[index].value)
    refs.current[index]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            disabled={disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                move(index, 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                move(index, -1)
              }
            }}
            className={cn(
              'relative inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-[color,border-color,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-transparent text-primary'
                : 'border-border bg-background/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/10 ring-[1.5px] ring-primary/60"
                transition={SPRING}
              />
            )}
            {option.icon && <span className="relative flex shrink-0 [&_svg]:size-3.5" aria-hidden>{option.icon}</span>}
            <span className="relative whitespace-nowrap">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const LEVEL_STYLES: Record<WcagLevel, string> = {
  AAA: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  AA: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  AA18: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  fail: 'bg-red-500/15 text-red-700 dark:text-red-300',
}

/** WCAG result shown with an icon and text, never color alone. */
export function LevelBadge({ ratio, plain, className }: { ratio: number; plain?: boolean; className?: string }) {
  const { t } = useTranslation()
  const level = wcagLevel(ratio)
  const Icon = level === 'fail' ? XIcon : CheckIcon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold whitespace-nowrap',
        plain ? 'border border-current/50' : LEVEL_STYLES[level],
        className,
      )}
    >
      <Icon className="size-2.5" aria-hidden />
      {t(`pg.level.${level}`)}
    </span>
  )
}

/** Small circle of dots placed at a harmony's hue offsets; decorative. */
export function HarmonyGlyph({ angles }: { angles: number[] }) {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      {angles.map((angle, index) => {
        const rad = (angle * Math.PI) / 180
        return (
          <circle
            key={angle}
            cx={8 + 6.25 * Math.sin(rad)}
            cy={8 - 6.25 * Math.cos(rad)}
            r={index === 0 ? 2 : 1.5}
            fill="currentColor"
          />
        )
      })}
    </svg>
  )
}