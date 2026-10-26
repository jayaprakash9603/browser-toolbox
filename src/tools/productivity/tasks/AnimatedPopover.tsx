import type { ComponentProps } from 'react'
import { motion } from 'motion/react'

import { PopoverContent } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'

/** Popover content that springs open from its trigger; closing is instant so it never lags input. */
export function AnimatedPopoverContent({
  children,
  className,
  collisionPadding = 8,
  ...props
}: ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      asChild
      collisionPadding={collisionPadding}
      className={cn(
        'scrollbar-styled max-h-(--radix-popover-content-available-height) max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain',
        className,
      )}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 560, damping: 36, mass: 0.7 }}
        style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
      >
        {children}
      </motion.div>
    </PopoverContent>
  )
}
