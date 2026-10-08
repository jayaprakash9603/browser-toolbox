import * as React from 'react'

import { cn } from '@/shared/utils/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  title?: string
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  ariaLabel: string
  size?: 'sm' | 'default'
  className?: string
}

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  size = 'default',
  className,
}: SegmentedProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  const moveFocus = (from: number, step: number) => {
    const count = options.length
    for (let offset = 1; offset <= count; offset += 1) {
      const index = (from + step * offset + count) % count
      if (!options[index].disabled) {
        onValueChange(options[index].value)
        refs.current[index]?.focus()
        return
      }
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 rounded-md border border-input bg-background p-0.5 shadow-xs', className)}
    >
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
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                moveFocus(index, 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveFocus(index, -1)
              }
            }}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-[5px] font-medium text-muted-foreground outline-none transition-[color,background-color] duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-[13px]',
              selected && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
