import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'

import { cn } from '@/shared/utils/cn'

export interface ChoiceChipOption<T extends string> {
  value: T
  label: string
}

interface ChoiceChipsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly ChoiceChipOption<T>[]
  ariaLabel: string
  /** Grid columns; wraps cleanly instead of overflowing in narrow panels. */
  columns?: 2 | 3 | 4
  className?: string
}

const COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const

/** Wrapping radio-group of chips with a sliding highlight. */
export function ChoiceChips<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  columns = 4,
  className,
}: ChoiceChipsProps<T>) {
  const reduce = useReducedMotion()
  const groupId = useId()
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('grid gap-1.5', COLUMNS[columns], className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative h-8 cursor-pointer rounded-lg border px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary/50 text-primary'
                : 'border-input bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`chip-${groupId}`}
                aria-hidden
                className="absolute inset-0 rounded-[7px] bg-primary/10"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
