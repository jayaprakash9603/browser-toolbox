import * as TabsPrimitive from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

export interface ModeTile<T extends string> {
  value: T
  label: string
  hint: string
  icon: LucideIcon
  /** Background and text classes for the icon chip. */
  tone: string
}

interface ModeTilesProps<T extends string> {
  /** Accessible name of the tab list. */
  label: string
  tiles: readonly ModeTile<T>[]
  value: T
  /** Unique per toolkit so the sliding highlight never jumps between lists. */
  layoutId: string
  className?: string
  hintClassName?: string
}

/** Tab triggers drawn as icon tiles; render inside a Radix `Tabs.Root`. */
export function ModeTiles<T extends string>({
  label,
  tiles,
  value,
  layoutId,
  className = 'grid grid-cols-3 gap-1.5 @[720px]:grid-cols-6',
  hintClassName = 'hidden @[560px]:block',
}: ModeTilesProps<T>) {
  const reduce = useReducedMotion()
  return (
    <TabsPrimitive.List aria-label={label} className={className}>
      {tiles.map(({ value: tile, label: name, hint, icon: Icon, tone }) => {
        const active = value === tile
        return (
          <TabsPrimitive.Trigger
            key={tile}
            value={tile}
            className={cn(
              'group/tile relative flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-card/60 px-2 py-2 text-left outline-none transition-[border-color,background-color,transform] duration-150 hover:border-foreground/15 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] @[480px]:px-2.5',
              active && 'border-transparent',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-primary/[0.07] ring-[1.5px] ring-primary/70"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/tile:scale-105 [&_svg]:size-3.5',
                tone,
              )}
              aria-hidden
            >
              <Icon />
            </span>
            <span className="relative flex min-w-0 flex-col">
              <span className={cn('truncate text-xs font-semibold', active ? 'text-foreground' : 'text-foreground/80')}>{name}</span>
              <span className={cn('truncate text-[10px] text-muted-foreground', hintClassName)}>{hint}</span>
            </span>
          </TabsPrimitive.Trigger>
        )
      })}
    </TabsPrimitive.List>
  )
}
