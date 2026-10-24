import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/shared/utils/cn'
import type { ClipFilter } from '../clipKinds'

export interface FilterOption {
  value: ClipFilter
  label: string
  count: number
}

interface FilterTabsProps {
  value: ClipFilter
  onChange: (value: ClipFilter) => void
  options: readonly FilterOption[]
  ariaLabel: string
}

export function FilterTabs({ value, onChange, options, ariaLabel }: FilterTabsProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="scrollbar-none flex gap-0.5 overflow-x-auto rounded-lg bg-muted/70 p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId="clipboard-filter-pill"
                aria-hidden
                className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-border"
                transition={
                  reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }
                }
              />
            )}
            <span className="relative">{option.label}</span>
            <span
              className={cn(
                'relative min-w-4 rounded-full px-1 text-center text-[10px] leading-4 tabular-nums transition-colors',
                selected ? 'bg-primary/12 text-primary' : 'bg-foreground/[0.06]',
              )}
            >
              {option.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
