import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

export interface Choice<T extends string> {
  value: T
  icon: LucideIcon
  label: ReactNode
  hint?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

interface ChoiceCardsProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  choices: readonly Choice<T>[]
  className?: string
}

/** A radio group of icon cards with a sliding highlight, for options that need a sentence of explanation. */
export function ChoiceCards<T extends string>({ label, value, onChange, choices, className }: ChoiceCardsProps<T>) {
  const reduce = useReducedMotion()
  const layoutId = useId()
  const enabled = choices.filter((choice) => !choice.disabled)
  const step = (delta: number) => {
    const index = enabled.findIndex((choice) => choice.value === value)
    const next = enabled[(index + delta + enabled.length) % enabled.length]
    if (next) onChange(next.value)
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-2 @[560px]:grid-cols-3', className)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          step(1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          step(-1)
        }
      }}
    >
      {choices.map(({ value: option, icon: Icon, label: name, hint, badge, disabled }) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              'relative flex cursor-pointer items-start gap-2.5 rounded-xl border bg-background/60 p-3 text-left outline-none transition-[border-color,background-color] duration-200 hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              active && 'border-transparent',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-primary/[0.06] ring-[1.5px] ring-primary/70"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-4',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              <Icon />
            </span>
            <span className="relative flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                {name}
                {badge && <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">{badge}</span>}
              </span>
              {hint && <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
